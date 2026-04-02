# Add Candidate

## Login
1. navigate to ${APP_URL}
2. click on toggle switch
3. wait 1 second
4. enter username/email ${APP_USERNAME}
5. enter password ${APP_PASSWORD}
6. click on "Sign In"
7. wait 5 seconds

## Navigate to Candidate Tab
8. wait for selector .ant-menu-title-content:has-text("Candidates")
9. force click on selector .ant-menu-title-content:has-text("Candidates")
10. wait 5 seconds

## Add Candidate
11. wait for selector button:has-text("Add Candidates")
12. click on "Add Candidates"
13. wait 3 seconds

## Upload Resume
14. click on "Resume File"
15. wait 2 seconds
16. upload file "C:\Users\Prismforce_ai\OneDrive - Prismforce India Private Limited\Desktop\SelectPrism Docs\prakash_Shinde_4yrs_EXP.docx"
17. click on "Upload"
18. wait for selector .ant-table-tbody tr:has-text("Uploaded")
19. wait 2 seconds

## Select and Commit Candidate
20. click on selector .ant-table-tbody .ant-table-selection-column .ant-checkbox-wrapper
21. wait 2 seconds
22. wait for selector button:has-text("Commit Candidates"):not([disabled])
23. click on "Commit Candidates"
24. wait 2 seconds
24. wait for selector .ant-table-tbody tr:has-text("Committed")

## Verify Success Message
25. wait for selector .ant-message-notice-content timeout 10000
26. assert text of selector .ant-message-notice-content contains "Candidates saved successfully!"
27. log text from selector .ant-message-notice-content label "Popup Message"
28. take screenshot
