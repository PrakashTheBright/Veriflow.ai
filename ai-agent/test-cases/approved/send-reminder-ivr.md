# Send Reminder IVR Flow

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

## Check Status and Send Reminder IVR to First Candidate
14. wait for selector .ant-table-tbody
15. wait 2 seconds
16. log section "Before Send Reminder IVR"
17. log text from selector .ant-table-tbody tr:first-child td:nth-child(2) label "Candidate ID"
18. log text from selector .ant-table-tbody tr:first-child td:nth-child(3) label "Candidate Name"
19. log text from selector .ant-table-tbody tr:first-child td:nth-child(4) label "Email ID"
20. log text from selector .ant-table-tbody tr:first-child td:nth-child(5) label "Application Status"
21. log text from selector .ant-table-tbody tr:first-child td:nth-child(6) label "Interview Status"
22. log text from selector .ant-table-tbody tr:first-child td:nth-child(7) label "Match Score"
23. log text from selector .ant-table-tbody tr:first-child td:nth-child(8) label "Expiry"
24. log text from selector .ant-table-tbody tr:first-child td:nth-child(9) label "Created At"

25. force click on selector .ant-table-tbody tr:first-child .ant-dropdown-trigger
26. wait 1 second
27. click on selector .ant-dropdown-menu-title-content:has-text("Send Reminder IVR")
28. wait 2 seconds

## Verify Reminder IVR Sent
29. wait for selector .ant-message-success, .ant-notification-notice-success, .ant-message
30. wait 2 seconds
31. log section "After Send Reminder IVR"
32. log text from selector .ant-message-notice-content label "Reminder IVR Message"

## Check Updated Status After IVR
33. wait for selector .ant-table-tbody tr
34. wait 2 seconds
35. log text from selector .ant-table-tbody tr:first-child td:nth-child(2) label "Candidate ID"
36. log text from selector .ant-table-tbody tr:first-child td:nth-child(3) label "Candidate Name"
37. log text from selector .ant-table-tbody tr:first-child td:nth-child(4) label "Email ID"
38. log text from selector .ant-table-tbody tr:first-child td:nth-child(5) label "Application Status"
39. log text from selector .ant-table-tbody tr:first-child td:nth-child(6) label "Interview Status"
40. log text from selector .ant-table-tbody tr:first-child td:nth-child(7) label "Match Score"
41. log text from selector .ant-table-tbody tr:first-child td:nth-child(8) label "Expiry"
42. log text from selector .ant-table-tbody tr:first-child td:nth-child(9) label "Created At"

## Screenshot
43. take screenshot
