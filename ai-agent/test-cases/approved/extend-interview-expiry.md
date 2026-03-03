# Extend Interview Expiry Flow

## Login
1. navigate to ${APP_URL}
2. click on toggle switch
3. wait 1 second
4. enter username/email ${APP_USERNAME}
5. enter password ${APP_PASSWORD}
6. click on "Sign In"
7. wait 5 seconds

## View Candidate
8. wait for selector .ant-card
9. wait 5 seconds
10. force click on selector role=button[name="ellipsis"]
11. wait 1 second
12. click on selector .ant-dropdown-menu-title-content:has-text("View Candidates")
13. wait 3 seconds

## Check Status and Log Candidate Data
14. wait for selector .ant-table-tbody
15. wait 2 seconds
16. log text from selector .ant-table-row:first-child>>td:nth-child(2) label "Candidate Name"
17. log text from selector .ant-table-row:first-child>>td:nth-child(3) label "Match Score"
18. log text from selector .ant-table-row:first-child>>td:nth-child(4) label "Status"
19. log text from selector .ant-table-row:first-child>>td:nth-child(5) label "City/Location"
20. log text from selector .ant-table-row:first-child>>td:nth-child(6) label "Email ID"
21. log text from selector .ant-table-row:first-child>>td:nth-child(7) label "Contact No"
22. log text from selector .ant-table-row:first-child>>td:nth-child(8) label "Role"
23. log text from selector .ant-table-row:first-child>>td:nth-child(9) label "Original Expiry"

## Extend Interview Expiry for First Candidate
24. force click on selector .ant-table-row:first-child >> role=button[name="ellipsis"]
25. wait 1 second
26. click on selector .ant-dropdown-menu-title-content:has-text("Extend Interview Expiry")
27. wait 2 seconds

## Select Date in Date Picker (Original Expiry + 30 Days)
28. wait for selector .ant-modal
29. wait 1 second
30. force click on selector .ant-modal .ant-picker, .ant-modal input[readonly], .ant-modal .ant-picker-input
31. wait 2 seconds
32. select date ${STORED:Original Expiry+30}
33. wait 1 second

## Save and Verify
34. click on selector .ant-modal-footer button.ant-btn-primary, .ant-modal-footer button:has-text("Save"), .ant-modal-footer button:has-text("OK")
35. wait 3 seconds
36. log text from selector .ant-table-row:first-child>>td:nth-child(9) label "Updated Expiry Date"
37. take screenshot
