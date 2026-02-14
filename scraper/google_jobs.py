import requests
import json
import os

import sys

API_KEY = os.environ.get("SERP_API_KEY", "4ac5e3d0d6183ed5928fa7fb48ed99ec6ebbbb6e6194bbfa0b6af00ed104bac6")

def scrape_google_jobs(keyword, location, limit=10, filename="google_jobs.json"):
    print("=" * 50)
    print("Google Jobs Scraper (via SerpAPI)")
    print("=" * 50)
    
    all_jobs = []
    
    current_url = "https://serpapi.com/search.json"
    current_params = {
        "engine": "google_jobs",
        "q": keyword,
        "location": location,
        "google_domain": "google.co.in",
        "gl": "in",
        "hl": "en", 
        "api_key": API_KEY,
    }
    
    page_num = 1
    
    try:
        while len(all_jobs) < limit:
            print(f"[Page {page_num}] Fetching jobs...")
            
            try:
                resp = requests.get(current_url, params=current_params)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                print(f"❌ API Request Failed: {e}")
                break
    
            if "error" in data:
                if "Google hasn't returned" in data['error']:
                     print("    ⚠ No more results.")
                else:
                     print(f"❌ API Error: {data['error']}")
                break
                
            print(f"    Info: {data.get('search_information', {})}")
    
            jobs_results = data.get("jobs_results", [])
            if not jobs_results:
                print("    ⚠ No more jobs found.")
                break
                
            print(f"    ✓ Found {len(jobs_results)} jobs")
    
            for i, job in enumerate(jobs_results):
                if len(all_jobs) >= limit:
                    break
                    
                title = job.get('title', 'N/A')
                company = job.get('company_name', 'N/A')
                
                print(f"  ({len(all_jobs)+1}) {title} @ {company}")
                
                location_str = job.get("location", "N/A")
                
                link = "N/A"
                apply_options = job.get("apply_options", [])
                if apply_options:
                    link = apply_options[0].get("link", "N/A")
                else:
                    link = job.get("share_link", "N/A")
                    
                description = job.get("description", "N/A")
                skills = []
                industry = "N/A"
                extensions = job.get("extensions", [])
                
                if description == "N/A" and extensions:
                     description = ", ".join(extensions)
    
                all_jobs.append({
                    "title": title,
                    "company": company,
                    "location": location_str,
                    "link": link,
                    "description": description,
                    "skills": skills,
                    "industry": industry
                })
            
            # Save incrementally
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(all_jobs, f, indent=4, ensure_ascii=False)
                
            next_url = data.get("serpapi_pagination", {}).get("next")
            if not next_url:
                print("    ⚠ No next page available.")
                break
                
            import time
            time.sleep(2) # Avoid rate limits
            current_url = next_url
            current_params = {"api_key": API_KEY} 
            page_num += 1
            
            if len(all_jobs) >= limit:
                break

    except Exception as e:
        print(f"❌ Scraper Error: {e}")

    finally:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(all_jobs, f, indent=4, ensure_ascii=False)
    
        print(f"\n✅ Scraped {len(all_jobs)} jobs!")
        print(f"💾 Saved to {filename}")
        
    return all_jobs

if __name__ == "__main__":
    if len(sys.argv) > 2:
        query = sys.argv[1]
        location = sys.argv[2]
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        output_file = sys.argv[4] if len(sys.argv) > 4 else "google_jobs.json"
        scrape_google_jobs(query, location, limit, output_file)
    else:
        scrape_google_jobs("Web Developer", "India", limit=20)
