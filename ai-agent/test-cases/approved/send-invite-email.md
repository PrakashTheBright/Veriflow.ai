# Send Invite Email Flow

## Login
1. navigate to ${APP_URL}
2. click on toggle switch
3. wait 1 second
4. enter username/email ${APP_USERNAME}
5. enter password ${APP_PASSWORD}
6. click on "Sign In"
7. wait 5 seconds

## View Candidate
8. wait 5 seconds
9. wait for selector role=button[name="ellipsis"]
10. force click on selector role=button[name="ellipsis"]
11. wait 1 second
12. click on selector .ant-dropdown-menu-title-content:has-text("View Candidates")
13. wait 3 seconds

## Check Status and Send Invite to First Candidate
14. wait for selector .ant-table-tbody
15. wait 5 seconds
16. wait for selector .ant-table-tbody tr
17. wait 3 seconds
18. log section "Before Send Invite Email"
19. log text from selector .ant-table-tbody tr:first-child td:nth-child(2) label "Candidate ID"
20. log text from selector .ant-table-tbody tr:first-child td:nth-child(3) label "Candidate Name"
21. log text from selector .ant-table-tbody tr:first-child td:nth-child(4) label "Email ID"
22. log text from selector .ant-table-tbody tr:first-child td:nth-child(5) label "Application Status"
23. log text from selector .ant-table-tbody tr:first-child td:nth-child(6) label "Interview Status"
24. log text from selector .ant-table-tbody tr:first-child td:nth-child(7) label "Match Score"
25. log text from selector .ant-table-tbody tr:first-child td:nth-child(8) label "Expiry"
26. log text from selector .ant-table-tbody tr:first-child td:nth-child(9) label "Created At"

27. force click on selector .ant-table-tbody tr:first-child .ant-dropdown-trigger
28. wait 2 seconds
29. click on selector .ant-dropdown-menu-title-content:has-text("Send Invite Email")
30. wait 3 seconds

## Verify Invite Email Sent
31. wait for selector .ant-message-notice-content
32. wait 2 seconds
33. log section "After Send Invite Email"
34. log text from selector .ant-message-notice-content label "Invite Email Message"

## Check Updated Status After Invite
35. wait for selector .ant-table-tbody tr
36. wait 2 seconds
37. log text from selector .ant-table-tbody tr:first-child td:nth-child(2) label "Candidate ID"
38. log text from selector .ant-table-tbody tr:first-child td:nth-child(3) label "Candidate Name"
39. log text from selector .ant-table-tbody tr:first-child td:nth-child(4) label "Email ID"
40. log text from selector .ant-table-tbody tr:first-child td:nth-child(5) label "Application Status"
41. log text from selector .ant-table-tbody tr:first-child td:nth-child(6) label "Interview Status"
42. log text from selector .ant-table-tbody tr:first-child td:nth-child(7) label "Match Score"
43. log text from selector .ant-table-tbody tr:first-child td:nth-child(8) label "Expiry"
44. log text from selector .ant-table-tbody tr:first-child td:nth-child(9) label "Created At"

## Screenshot
45. take screenshot
