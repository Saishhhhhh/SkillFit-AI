import requests
from bs4 import BeautifulSoup
import json
import sys
import time
import random
import re
from fake_useragent import UserAgent

def get_headers():
    ua = UserAgent()
    return {
        "User-Agent": ua.random,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.google.com/",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-User": "?1",
    }

def fetch_with_retries(session, url, max_retries=3):
    for attempt in range(max_retries):
        try:
            resp = session.get(url, headers=get_headers(), timeout=15)
            if resp.status_code == 200:
                return resp
            elif resp.status_code == 403:
                print(f"    [403] Blocked. Attempt {attempt+1}/{max_retries}")
                time.sleep(random.uniform(5, 10))
            elif resp.status_code == 429:
                print(f"    [429] Rate limited. Waiting {2**(attempt+2)}s...")
                time.sleep(2**(attempt+2))
            else:
                print(f"    [{resp.status_code}] Unexpected status")
                return None
        except requests.RequestException as e:
            print(f"    [Error] {e}")
            time.sleep(3)
    return None

def strip_html(text):
    if not text:
        return "N/A"
    clean = re.sub(r'<[^>]+>', '', text)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

def extract_job_links(html):
    jobs = []

    match = re.search(r'window\.mosaic\.providerData\["mosaic-provider-jobcards"\]\s*=\s*(\{.+?\});', html, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(1))
            results = data.get("metaData", {}).get("mosaicProviderJobCardsModel", {}).get("results", [])
            for r in results:
                jobs.append({
                    "title": strip_html(r.get("title", "N/A")),
                    "company": strip_html(r.get("company", "N/A")),
                    "location": r.get("formattedLocation", r.get("jobLocationCity", "N/A")),
                    "link": f"https://in.indeed.com/viewjob?jk={r.get('jobkey', '')}",
                })
            return jobs
        except (json.JSONDecodeError, KeyError):
            pass

    soup = BeautifulSoup(html, "html.parser")
    cards = soup.find_all("div", class_="job_seen_beacon") or soup.select("div[data-jk]")
    for card in cards:
        title_el = card.find("h2") or card.find("a", class_=re.compile("jcs-JobTitle"))
        company_el = card.find("span", {"data-testid": "company-name"}) or card.find(class_=re.compile("company"))
        loc_el = card.find("div", {"data-testid": "text-location"}) or card.find(class_=re.compile("location"))
        link_el = card.find("a", href=True)

        href = link_el["href"] if link_el else ""
        link = f"https://in.indeed.com{href}" if href.startswith("/") else href

        jobs.append({
            "title": title_el.get_text(strip=True) if title_el else "N/A",
            "company": company_el.get_text(strip=True) if company_el else "N/A",
            "location": loc_el.get_text(strip=True) if loc_el else "N/A",
            "link": link.split("&")[0] if "&" in link else link,
        })

    return jobs

def scrape_job_details(session, url):
    resp = fetch_with_retries(session, url)
    if not resp:
        return None

    html = resp.text
    if "captcha" in html.lower() or len(html) < 3000:
        return None

    soup = BeautifulSoup(html, "html.parser")

    desc_el = soup.find("div", id="jobDescriptionText") or soup.find("div", class_=re.compile("jobsearch-JobComponent-description"))
    description = desc_el.get_text(separator="\n", strip=True) if desc_el else "N/A"

    industry = "N/A"
    meta_items = soup.find_all("div", class_=re.compile("jobsearch-JobDescriptionSection-sectionItem"))
    for item in meta_items:
        label = item.find("span", class_=re.compile("label"))
        if label and "industry" in label.get_text().lower():
            val = item.find("span", class_=re.compile("value"))
            if val:
                industry = val.get_text(strip=True)

    skills = []
    skill_section = soup.find("div", id="salaryGuide") or soup.find("div", class_=re.compile("jobsearch-ReqAndQual"))
    if not skill_section:
        if desc_el:
            bullets = desc_el.find_all("li")

    return {
        "description": description,
        "skills": skills,
        "industry": industry
    }

def scrape_indeed(keyword, location, limit=10, filename="indeed.json"):
    session = requests.Session()
    all_jobs = []
    seen = set()
    page = 0

    formatted_kw = keyword.replace(" ", "+")
    formatted_loc = location.replace(" ", "+")

    print("=" * 50)
    print("Indeed Job Scraper")
    print("=" * 50)

    print(f"[1/2] Fetching job links for '{keyword}' in '{location}'...")
    job_links = []

    while len(job_links) < limit:
        start = page * 10
        url = f"https://in.indeed.com/jobs?q={formatted_kw}&l={formatted_loc}&start={start}"

        resp = fetch_with_retries(session, url)
        if not resp:
            break

        html = resp.text
        if "captcha" in html.lower() or len(html) < 5000:
            print("    ⚠ Blocked/CAPTCHA. Stopping search.")
            break

        jobs = extract_job_links(html)
        if not jobs:
            break

        for job in jobs:
            key = f"{job['title']}@{job['company']}"
            if key not in seen and len(job_links) < limit:
                seen.add(key)
                job_links.append(job)

        print(f"      Found {len(job_links)} unique jobs so far...")
        page += 1
        time.sleep(random.uniform(3, 6))

    print(f"      Total: {len(job_links)} job links\n")

    print(f"[2/2] Scraping details from each listing...")

    for i, job in enumerate(job_links):
        print(f"  ({i+1}/{len(job_links)}) {job['title']} @ {job['company']}")
        time.sleep(random.uniform(3, 7))

        details = scrape_job_details(session, job["link"])
        if details:
            job_data = {
                "title": job["title"],
                "company": job["company"],
                "location": job["location"],
                "link": job["link"],
                "description": details["description"],
                "skills": details["skills"],
                "industry": details["industry"]
            }
        else:
            job_data = {
                "title": job["title"],
                "company": job["company"],
                "location": job["location"],
                "link": job["link"],
                "description": "N/A",
                "skills": [],
                "industry": "N/A"
            }
            print("      ⚠ Detail page blocked, using search snippet")

        all_jobs.append(job_data)

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(all_jobs, f, indent=4, ensure_ascii=False)

    if all_jobs:
        print(f"\n✅ Scraped {len(all_jobs)} jobs!")
        print(f"💾 Saved to {filename}")
    else:
        print("\n❌ No jobs scraped. Indeed blocked the requests.")

    return all_jobs

if __name__ == "__main__":
    if len(sys.argv) > 2:
        query = sys.argv[1]
        location = sys.argv[2]
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        output_file = sys.argv[4] if len(sys.argv) > 4 else "indeed.json"
        scrape_indeed(query, location, limit, output_file)
    else:
        scrape_indeed("Data Scientist", "India", limit=10)
