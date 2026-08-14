# Dispatch for teamwork_preview_explorer_survey_4_1

## Identity
- Role: Codebase Investigator (Backend Image Ingestion & OCR Pipeline)
- Working Directory: /Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_4_1
- Parent Conversation ID: 723b76f6-32ae-4c03-9b1d-41af1fd93738

## Authoritative Requirements
Read the authoritative request at:
/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/ORIGINAL_REQUEST.md
Specifically review the latest section: ## 2026-09-04T00:41:31Z.

## Objective
Investigate backend image ingestion, endpoints, and OCR text scam intelligence:
1. Examine existing backend image upload endpoints (such as `/api/v1/detect/image-ocr`, `/api/v1/detect/image`, or related routes in `backend/`).
2. Examine how RapidOCR, character counting, text density checks, IOC extraction (phone numbers, UPI IDs, APK links), Tavily cross-checking, and scam classification are currently structured and executed.
3. Locate existing test files and sample test assets (e.g., `file-JXAGnmm9Vl.png` KBC lottery scam or others in the codebase).
4. Identify how pre-classification can be inserted:
   - Text density check: RapidOCR extracting text lines and char count (< 30 vs >= 30 chars).
   - Branch B execution (Document): `char_count >= 30` and `face_count == 0`.
   - Branch C execution (Hybrid): `char_count >= 30` and `face_count >= 1`.
5. Identify all input/output schemas (Pydantic models, response payloads) and where modifications or additions are required.
6. Provide a comprehensive report in `/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/.agents/teamwork_preview_explorer_survey_4_1/handoff.md`.
