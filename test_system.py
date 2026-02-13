"""
SkillFit-AI — End-to-End System Test
=====================================
Simulates the full frontend flow:
  1. Upload Resume PDF
  2. Confirm Skills (simulated)
  3. Generate User Vectors (/embed)
  4. Search Jobs (/search) with vectors
  5. Poll until done, fetch scored results
  6. Save JSON artifacts at every stage
"""

import requests
import json
import time
import os
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "test_output")
RESUME_PATH = os.path.join(os.path.dirname(__file__), "resume.pdf")

# Search config
JOB_QUERY = "Data Scientist"
JOB_LOCATION = "India"
JOB_PORTALS = ["naukri", "linkedin", "indeed", "glassdoor", "google"]  # Use naukri for fast testing; add "linkedin" etc. as needed


def save_json(filename, data):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  💾 Saved: {path}")


def step1_upload_resume():
    print("\n" + "=" * 60)
    print("STEP 1: Uploading Resume")
    print("=" * 60)

    if not os.path.exists(RESUME_PATH):
        print(f"  ❌ Resume not found at: {RESUME_PATH}")
        print(f"  📁 Please place your resume.pdf there and re-run.")
        sys.exit(1)

    with open(RESUME_PATH, "rb") as f:
        response = requests.post(
            f"{BASE_URL}/profile/upload",
            files={"file": ("resume.pdf", f, "application/pdf")}
        )

    if response.status_code != 200:
        print(f"  ❌ Upload failed: {response.status_code} — {response.text}")
        sys.exit(1)

    data = response.json()
    save_json("1_upload_response.json", data)

    skills = [s["name"] for s in data.get("skills", [])]
    print(f"  ✅ Extracted {len(skills)} skills: {skills[:10]}...")
    print(f"  📄 Text length: {data['metadata']['text_length']} chars")

    return data


def step2_confirm_skills(upload_data):
    print("\n" + "=" * 60)
    print("STEP 2: Confirming Skills (Simulated)")
    print("=" * 60)

    raw_text = upload_data["raw_text"]
    extracted_skills = [s["name"] for s in upload_data["skills"]]

    # Simulate user confirmation — keep all skills as-is
    confirmed_skills = extracted_skills

    confirmed_profile = {
        "raw_text": raw_text,
        "confirmed_skills": confirmed_skills,
    }

    save_json("2_confirmed_profile.json", confirmed_profile)
    print(f"  ✅ Confirmed {len(confirmed_skills)} skills")

    return confirmed_profile


def step3_generate_vectors(confirmed_profile):
    print("\n" + "=" * 60)
    print("STEP 3: Generating User Vectors (/embed)")
    print("=" * 60)

    response = requests.post(
        f"{BASE_URL}/profile/embed",
        json=confirmed_profile,
    )

    if response.status_code != 200:
        print(f"  ❌ Embed failed: {response.status_code} — {response.text}")
        sys.exit(1)

    data = response.json()

    # Save a summary (vectors are huge, save separately)
    summary = {
        "global_vector_length": len(data["global_vector"]),
        "skill_vector_length": len(data["skill_vector"]),
        "skills_used": data.get("skills_used", []),
        "metadata": data.get("metadata", {}),
    }
    save_json("3_embed_summary.json", summary)

    # Save full vectors too
    save_json("3_user_vectors_full.json", data)

    print(f"  ✅ Global vector: {len(data['global_vector'])} dims")
    print(f"  ✅ Skill vector:  {len(data['skill_vector'])} dims")

    return data


def step4_search_jobs(user_vectors):
    print("\n" + "=" * 60)
    print(f"STEP 4: Searching Jobs — '{JOB_QUERY}' in '{JOB_LOCATION}'")
    print(f"         Portals: {JOB_PORTALS}")
    print("=" * 60)

    search_payload = {
        "query": JOB_QUERY,
        "location": JOB_LOCATION,
        "portals": JOB_PORTALS,
        "user_vectors": {
            "global_vector": user_vectors["global_vector"],
            "skill_vector": user_vectors["skill_vector"],
        }
    }

    save_json("4_search_request.json", {
        "query": JOB_QUERY,
        "location": JOB_LOCATION,
        "portals": JOB_PORTALS,
        "user_vectors_included": True,
    })

    response = requests.post(f"{BASE_URL}/jobs/search", json=search_payload)

    if response.status_code != 200:
        print(f"  ❌ Search failed: {response.status_code} — {response.text}")
        sys.exit(1)

    data = response.json()
    task_id = data["task_id"]
    print(f"  ✅ Task started: {task_id}")

    return task_id


def step5_poll_and_fetch(task_id):
    print("\n" + "=" * 60)
    print("STEP 5: Waiting for Results...")
    print("=" * 60)

    max_wait = 300  # 5 minutes
    elapsed = 0
    poll_interval = 5

    while elapsed < max_wait:
        response = requests.get(f"{BASE_URL}/jobs/status/{task_id}")
        status_data = response.json()
        status = status_data.get("status", "unknown")

        print(f"  ⏳ [{elapsed}s] Status: {status}")

        if status == "completed":
            break

        time.sleep(poll_interval)
        elapsed += poll_interval

    if status != "completed":
        print(f"  ❌ Timed out after {max_wait}s")
        save_json("5_status_timeout.json", status_data)
        sys.exit(1)

    # Fetch results
    response = requests.get(f"{BASE_URL}/jobs/results/{task_id}")
    if response.status_code != 200:
        print(f"  ❌ Results fetch failed: {response.status_code}")
        sys.exit(1)

    results = response.json()
    save_json("5_final_results.json", results)

    return results


def step6_display_results(results):
    print("\n" + "=" * 60)
    print("STEP 6: RESULTS")
    print("=" * 60)

    jobs = results.get("jobs", [])
    market_reach = results.get("market_reach", "N/A")
    avg_score = results.get("average_score", "N/A")
    total = results.get("total_jobs", len(jobs))
    high_match = results.get("high_match_jobs", "N/A")

    print(f"\n  📊 MARKET SCORECARD")
    print(f"  ──────────────────────────────────")
    print(f"  Total Jobs Scraped   : {total}")
    print(f"  High Match (>70%)    : {high_match}")
    print(f"  Market Reach Score   : {market_reach}%")
    print(f"  Average Match Score  : {avg_score}%")
    print(f"  ──────────────────────────────────")

    print(f"\n  📋 TOP JOBS (sorted by match score):\n")
    for i, job in enumerate(jobs[:10], 1):
        score = job.get("match_score", "N/A")
        title = job.get("title", "Unknown")
        company = job.get("company", "Unknown")
        portal = job.get("portal", "?")
        skills = job.get("skills", [])
        skill_str = ", ".join(skills[:5]) if skills else "None extracted"

        bar = "█" * int(float(score) / 5) if isinstance(score, (int, float)) else ""
        print(f"  {i:2d}. [{score:>5}%] {bar}")
        print(f"      {title} @ {company} ({portal})")
        print(f"      Skills: {skill_str}")
        print()


def main():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║         SkillFit-AI — End-to-End System Test            ║")
    print("╚══════════════════════════════════════════════════════════╝")

    # Step 1: Upload
    upload_data = step1_upload_resume()

    # Step 2: Confirm
    confirmed = step2_confirm_skills(upload_data)

    # Step 3: Embed
    vectors = step3_generate_vectors(confirmed)

    # Step 4: Search
    task_id = step4_search_jobs(vectors)

    # Step 5: Poll & Fetch
    results = step5_poll_and_fetch(task_id)

    # Step 6: Display
    step6_display_results(results)

    print("\n✅ All test artifacts saved in: test_output/")
    print("Done!")


if __name__ == "__main__":
    main()
