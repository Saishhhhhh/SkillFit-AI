import json
import sys
import time
import random
from playwright.sync_api import sync_playwright

JS_EXTRACT = """() => {
    const locEl = document.querySelector('[class*="jhc__loc"]');

    const descEl = document.querySelector('[class*="styles_JDC__dang-inner-html"]')
                 || document.querySelector('[class*="job-desc"]')
                 || document.querySelector('[class*="jobDesc"]');

    const otherSection = document.querySelector('[class*="other-detail"]');
    let industry = "N/A";
    if (otherSection) {
        const labels = otherSection.querySelectorAll("label");
        labels.forEach(label => {
            const key = label.innerText.trim().toLowerCase();
            if (key.includes("industry")) {
                const valueEl = label.nextElementSibling;
                industry = valueEl ? valueEl.innerText.trim() : "N/A";
            }
        });
    }

    const skillSet = new Set();
    const sels = [
        '[class*="chip-grid"] a',
        '[class*="key-skill"] a',
        '[class*="keySkill"] a',
        'a[class*="chip"][href*="keyword"]',
        '[class*="tag-container"] a'
    ];
    for (const sel of sels) {
        document.querySelectorAll(sel).forEach(el => {
            const t = el.innerText.trim();
            if (t && t.length < 60) skillSet.add(t);
        });
        if (skillSet.size > 0) break;
    }

    return {
        location: locEl ? locEl.innerText.trim() : "N/A",
        description: descEl ? descEl.innerText.trim() : "N/A",
        industry: industry,
        skills: [...skillSet]
    };
}"""


def scrape_naukri(keyword, location, limit=10, filename="naukri.json"):
    formatted_keyword = keyword.lower().replace(" ", "-")
    formatted_location = location.lower().replace(" ", "-")
    search_url = f"https://www.naukri.com/{formatted_keyword}-jobs-in-{formatted_location}"

    job_links = []
    seen_ids = set()

    def handle_response(response):
        if "/jobapi/" in response.url and response.status == 200:
            try:
                data = response.json()
                for job in data.get("jobDetails", []):
                    job_id = str(job.get("jobId", ""))
                    if job_id and job_id not in seen_ids and len(job_links) < limit:
                        seen_ids.add(job_id)
                        job_links.append({
                            "title": job.get("title", "N/A"),
                            "company": job.get("companyName", "N/A"),
                            "link": f"https://www.naukri.com{job['jdURL']}" if job.get("jdURL") else "N/A"
                        })
            except:
                pass

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
        page.on("response", handle_response)

        print(f"[1/2] Fetching job links from search...")
        try:
            page.goto(search_url, wait_until="networkidle", timeout=30000)
        except:
            pass
        page.wait_for_timeout(3000)
        print(f"      Found {len(job_links)} unique jobs")

        print(f"[2/2] Scraping details from each listing...")
        all_jobs = []

        for i, job in enumerate(job_links):
            if job["link"] == "N/A":
                continue

            print(f"  ({i+1}/{len(job_links)}) {job['title']} @ {job['company']}")
            time.sleep(random.uniform(2, 5))

            try:
                page.goto(job["link"], wait_until="domcontentloaded", timeout=20000)
                page.wait_for_timeout(2000)

                details = page.evaluate(JS_EXTRACT)

                loc = details.get("location", "")
                if loc and "\n" in loc:
                    details["location"] = loc.split("\n")[0].strip()

                job_data = {
                    "title": job["title"],
                    "company": job["company"],
                    "location": details.get("location", "N/A"),
                    "link": job["link"],
                    "description": details.get("description", "N/A"),
                    "skills": details.get("skills", []),
                    "industry": details.get("industry", "N/A")
                }
                all_jobs.append(job_data)

                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(all_jobs, f, indent=4, ensure_ascii=False)

            except Exception as e:
                print(f"    ⚠ Failed: {e}")
                continue

        return all_jobs

    finally:
        if browser:
            browser.close()
        if pw:
            pw.stop()


if __name__ == "__main__":
    print("=" * 50)
    print("Naukri.com Job Scraper")
    print("=" * 50)

    if len(sys.argv) > 2:
        query = sys.argv[1]
        location = sys.argv[2]
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        output_file = sys.argv[4] if len(sys.argv) > 4 else "naukri.json"
        data = scrape_naukri(query, location, limit, output_file)
    else:
        data = scrape_naukri("Web Developer", "India", limit=10)
        output_file = "naukri.json" # Default filename for the else branch

    if data:
        print(f"\n✅ Scraped {len(data)} jobs!")
        for i, job in enumerate(data, 1):
            print(f"  {i}. {job['title']} @ {job['company']}")
            print(f"     Skills: {', '.join(job.get('skills', []))[:80]}")
        print(f"\n💾 Saved to {output_file}")
    else:
        print("\n❌ No jobs found.")