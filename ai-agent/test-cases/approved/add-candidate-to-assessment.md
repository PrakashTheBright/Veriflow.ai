# Add Candidate To Assessment

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
20. force click on selector .ant-table-tbody .ant-table-selection-column .ant-checkbox-inner
21. wait 2 seconds
22. wait for selector button:has-text("Commit Candidates"):not([disabled])
23. click on "Commit Candidates"
24. wait 5 seconds

## Add to Assessment
25. force click on selector .ant-table-tbody .ant-table-selection-column .ant-checkbox-inner
26. wait 2 seconds
27. wait for selector button:has-text("Add to Assessment")
28. click on "Add to Assessment"
29. wait 3 seconds

## Select Assessment Row
30. wait for selector .ant-modal-content
31. wait for selector .ant-modal-content .ant-table-tbody tr:first-child
32. click on selector .ant-modal-content .ant-table-tbody tr:first-child
33. wait 1 second
34. click on "Add"
35. wait 2 seconds

## Verify Success Message
36. wait for selector .ant-message-notice-content
37. log text from selector .ant-message-notice-content label "Popup Message"
38. wait 2 seconds

## Screenshot
39. take screenshot
