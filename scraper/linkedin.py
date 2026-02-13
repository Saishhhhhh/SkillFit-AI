import requests
from bs4 import BeautifulSoup
import json
import sys
import time
import random
from fake_useragent import UserAgent

def get_random_headers():
    ua = UserAgent()
    return {
        "User-Agent": ua.random,
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.linkedin.com/"
    }

def fetch_with_retries(url, max_retries=3):
    for attempt in range(max_retries):
        try:
            headers = get_random_headers()
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                return response
            elif response.status_code == 429:
                print(f"  [429] Rate limited. Retrying in {2**(attempt+1)}s...")
                time.sleep(2**(attempt+1))
            else:
                if 500 <= response.status_code < 600:
                    time.sleep(2)
                else:
                    return None
        except requests.RequestException as e:
            print(f"  [Error] {e}. Retrying...")
            time.sleep(2)
    return None

def get_job_details(job_id):
    target_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"
    resp = fetch_with_retries(target_url)
    if not resp:
        return None

    try:
        soup = BeautifulSoup(resp.text, 'html.parser')

        jd_div = soup.find("div", class_="description__text")
        description = jd_div.get_text(separator="\n", strip=True) if jd_div else "N/A"

        location_tag = soup.find("span", class_="sub-nav-cta__meta-text")
        if not location_tag:
             location_tag = soup.find("span", class_="topcard__flavor--bullet")
        location = location_tag.get_text(strip=True) if location_tag else "N/A"

        industry = "N/A"
        skills = []
        criteria_list = soup.find_all("li", class_="description__job-criteria-item")
        for item in criteria_list:
            label = item.find("h3").get_text(strip=True).lower()
            value = item.find("span").get_text(strip=True)
            if "industries" in label:
                industry = value

        return {
            "location": location,
            "description": description,
            "skills": skills,
            "industry": industry
        }
    except Exception as e:
        print(f"  [Parse Error] Could not parse details for {job_id}: {e}")
        return None

def save_jobs(jobs, filename="linkedin.json"):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(jobs, f, indent=4, ensure_ascii=False)

def scrape_linkedin(job_title, location, limit=10, filename="linkedin.json"):
    unique_jobs = []
    seen_ids = set()
    page_number = 0

    print(f"[1/2] Searching LinkedIn for '{job_title}' in '{location}'...")
    save_jobs([], filename)

    while len(unique_jobs) < limit:
        start_index = page_number * 25
        search_url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={job_title}&location={location}&start={start_index}"

        response = fetch_with_retries(search_url)
        if not response:
            print("  [Failed] Could not fetch search page. Stopping.")
            break

        soup = BeautifulSoup(response.text, 'html.parser')
        job_cards = soup.find_all('li')

        if not job_cards:
            if page_number > 50:
                break

        for card in job_cards:
            if len(unique_jobs) >= limit:
                break
            try:
                link_tag = card.find('a', class_='base-card__full-link')
                if not link_tag:
                    continue

                link = link_tag['href'].split('?')[0]
                job_id = link.split('-')[-1]

                if job_id in seen_ids:
                    continue
                seen_ids.add(job_id)

                title_tag = card.find('h3', class_='base-search-card__title')
                company_tag = card.find('h4', class_='base-search-card__subtitle')
                loc_tag = card.find(class_="job-search-card__location")

                title = title_tag.text.strip() if title_tag else "N/A"
                company = company_tag.text.strip() if company_tag else "N/A"
                card_location = loc_tag.text.strip() if loc_tag else "N/A"

                print(f"  ({len(unique_jobs)+1}/{limit}) {title} @ {company}")

                details = get_job_details(job_id)
                if details:
                    final_loc = details["location"]
                    if final_loc == "N/A":
                        final_loc = card_location

                    job_data = {
                        "title": title,
                        "company": company,
                        "location": final_loc,
                        "link": link,
                        "description": details["description"],
                        "skills": details["skills"],
                        "industry": details["industry"]
                    }
                    unique_jobs.append(job_data)
                    save_jobs(unique_jobs, filename)
                else:
                    print("      ⚠ Skipped (no details)")

                time.sleep(random.uniform(3, 6))
            except Exception as e:
                print(f"  [Error] {e}")
                continue

        page_number += 1
        time.sleep(random.uniform(4, 8))

    print(f"\n✅ Scraped {len(unique_jobs)} jobs!")
    print(f"💾 Saved to {filename}")
    return unique_jobs

if __name__ == "__main__":
    if len(sys.argv) > 2:
        query = sys.argv[1]
        location = sys.argv[2]
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        output_file = sys.argv[4] if len(sys.argv) > 4 else "linkedin.json"
        scrape_linkedin(query, location, limit, output_file)
    else:
        scrape_linkedin("Web Developer", "India", limit=10)
