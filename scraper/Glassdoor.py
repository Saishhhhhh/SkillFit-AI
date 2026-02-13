import json
import sys
import time
import random
import re
from playwright.sync_api import sync_playwright

def strip_html(text):
    if not text:
        return "N/A"
    clean = re.sub(r'<[^>]+>', ' ', text)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

def clean_company(name):
    if not name:
        return "N/A"
    cleaned = re.split(r'\n\d+\.?\d*', name)[0].strip()
    return cleaned if cleaned else name

JS_EXTRACT_LINKS = """() => {
    const jobs = [];

    // Try ld+json first
    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of ldScripts) {
        try {
            const data = JSON.parse(s.textContent);
            if (data["@type"] === "ItemList") {
                for (const item of (data.itemListElement || [])) {
                    const jp = item["@type"] === "JobPosting" ? item : (item.item || {});
                    if (jp["@type"] === "JobPosting") {
                        const loc = Array.isArray(jp.jobLocation) ? jp.jobLocation[0] : (jp.jobLocation || {});
                        const addr = loc.address || {};
                        jobs.push({
                            title: jp.title || "N/A",
                            company: (jp.hiringOrganization || {}).name || "N/A",
                            location: addr.addressLocality || addr.addressRegion || "N/A",
                            link: jp.url || "N/A",
                            description: jp.description || "N/A"
                        });
                    }
                }
            }
        } catch(e) {}
    }
    if (jobs.length > 0) return jobs;

    // Try job cards from DOM
    const cards = document.querySelectorAll('[data-test="jobListing"], [class*="JobCard"], [class*="jobCard"]');
    for (const card of cards) {
        const titleEl = card.querySelector('[class*="jobTitle"] a, a[data-test="job-title"], [class*="JobCard_jobTitle"] a');
        const companyEl = card.querySelector('[class*="EmployerProfile"], [class*="employer"], [data-test="emp-name"]');
        const locEl = card.querySelector('[class*="location"], [data-test="emp-location"]');

        let link = "N/A";
        if (titleEl && titleEl.href) {
            link = titleEl.href;
        }

        jobs.push({
            title: titleEl ? titleEl.innerText.trim() : "N/A",
            company: companyEl ? companyEl.innerText.trim() : "N/A",
            location: locEl ? locEl.innerText.trim() : "N/A",
            link: link,
            description: "N/A"
        });
    }

    return jobs;
}"""

JS_EXTRACT_DETAILS = """() => {
    // Try ld+json on detail page
    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of ldScripts) {
        try {
            const data = JSON.parse(s.textContent);
            if (data["@type"] === "JobPosting") {
                return {
                    description: data.description || "N/A",
                    industry: (data.industry || "N/A")
                };
            }
        } catch(e) {}
    }

    // Try DOM description
    const descEl = document.querySelector('[class*="JobDetails_jobDescription"], [class*="desc"], #JobDescriptionContainer, [class*="jobDescriptionContent"]');
    return {
        description: descEl ? descEl.innerText.trim() : "N/A",
        industry: "N/A"
    };
}"""


def scrape_glassdoor(keyword, location, limit=10, filename="glassdoor.json"):
    formatted_kw = keyword.lower().replace(" ", "-")
    search_url = f"https://www.glassdoor.co.in/Job/{location.lower()}-{formatted_kw}-jobs-SRCH_IL.0,{len(location)}_IN115_KO{len(location)+1},{len(location)+1+len(formatted_kw)}.htm"
    fallback_url = f"https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword={keyword.replace(' ', '+')}&locKeyword={location}"

    job_links = []
    seen = set()
    browser = None
    pw = None

    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(
            headless=False,
            args=["--window-position=-2400,-2400", "--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        context.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")
        page = context.new_page()

        print("=" * 50)
        print("Glassdoor Job Scraper (Playwright)")
        print("=" * 50)

        print(f"[1/2] Fetching job links for '{keyword}' in '{location}'...")

        for url in [search_url, fallback_url]:
            if len(job_links) >= limit:
                break

            print(f"    Trying: {url[:80]}...")
            try:
                page.goto(url, wait_until="networkidle", timeout=30000)
            except:
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=30000)
                except:
                    print("    ⚠ Navigation failed")
                    continue

            page.wait_for_timeout(3000)

            title = page.title()
            if "security" in title.lower() or "captcha" in title.lower():
                print(f"    ⚠ Cloudflare challenge: '{title}'")
                print("    Waiting 10s for challenge to resolve...")
                page.wait_for_timeout(10000)
                title = page.title()
                if "security" in title.lower():
                    print("    ⚠ Still blocked. Trying next URL...")
                    continue

            jobs = page.evaluate(JS_EXTRACT_LINKS)
            if jobs:
                print(f"    ✓ Found {len(jobs)} jobs")
                for job in jobs:
                    if job['title'] == 'N/A' and job['company'] == 'N/A':
                        continue
                    if job['link'] == 'N/A':
                        continue
                    key = f"{job['title']}@{job['company']}"
                    if key not in seen and len(job_links) < limit:
                        seen.add(key)
                        job_links.append(job)
                break
            else:
                print("    ⚠ No jobs extracted from this page")

        print(f"    Total: {len(job_links)} job links\n")

        if not job_links:
            print("\n❌ Could not fetch any jobs. Glassdoor blocked all attempts.")
            return []

        print(f"[2/2] Scraping details from each listing...")
        all_jobs = []

        for i, job in enumerate(job_links):
            print(f"  ({i+1}/{len(job_links)}) {job['title']} @ {clean_company(job['company'])}")

            desc = strip_html(job.get("description", ""))
            if desc and desc != "N/A" and len(desc) > 100:
                job_data = {
                    "title": job["title"],
                    "company": clean_company(job["company"]),
                    "location": job["location"],
                    "link": job["link"],
                    "description": desc,
                    "skills": [],
                    "industry": "N/A"
                }
            else:
                time.sleep(random.uniform(2, 5))
                try:
                    page.goto(job["link"], wait_until="domcontentloaded", timeout=20000)
                    page.wait_for_timeout(2000)
                    details = page.evaluate(JS_EXTRACT_DETAILS)
                    job_data = {
                        "title": job["title"],
                        "company": clean_company(job["company"]),
                        "location": job["location"],
                        "link": job["link"],
                        "description": strip_html(details.get("description", "N/A")),
                        "skills": [],
                        "industry": details.get("industry", "N/A")
                    }
                except Exception as e:
                    print(f"    ⚠ Failed: {e}")
                    job_data = {
                        "title": job["title"],
                        "company": clean_company(job["company"]),
                        "location": job["location"],
                        "link": job["link"],
                        "description": "N/A",
                        "skills": [],
                        "industry": "N/A"
                    }

            all_jobs.append(job_data)
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(all_jobs, f, indent=4, ensure_ascii=False)

        print(f"\n✅ Scraped {len(all_jobs)} jobs!")
        print(f"💾 Saved to {filename}")
        return all_jobs

    finally:
        if browser:
            browser.close()
        if pw:
            pw.stop()


if __name__ == "__main__":
    if len(sys.argv) > 2:
        query = sys.argv[1]
        location = sys.argv[2]
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        output_file = sys.argv[4] if len(sys.argv) > 4 else "glassdoor.json"
        scrape_glassdoor(query, location, limit, output_file)
    else:
        scrape_glassdoor("Web Developer", "India", limit=10)
