# Trigger Candidate Invite

## Login
1. navigate to ${APP_URL}
2. click on toggle switch
3. wait 1 second
4. enter username/email ${APP_USERNAME}
5. enter password ${APP_PASSWORD}
6. click on "Sign In"
7. wait 5 seconds

## View Candidate
8. wait for selector role=button[name="ellipsis"]
9. force click on selector role=button[name="ellipsis"]
10. wait 1 second
11. click on selector .ant-dropdown-menu-title-content:has-text("View Candidates")
12. wait 3 seconds

## Check Status and Send Invite to First Candidate
13. wait for selector .ant-table-tbody
14. wait for selector .ant-table-tbody tr
15. wait 3 seconds
16. log section "Before Trigger Invitation Data"

17. log text from selector .ant-table-tbody tr:first-child td:nth-child(2) label "Candidate ID"
18. log text from selector .ant-table-tbody tr:first-child td:nth-child(3) label "Candidate Name"
19. log text from selector .ant-table-tbody tr:first-child td:nth-child(4) label "Email ID"
20. log text from selector .ant-table-tbody tr:first-child td:nth-child(5) label "Application Status"
21. log text from selector .ant-table-tbody tr:first-child td:nth-child(6) label "Interview Status"
22. log text from selector .ant-table-tbody tr:first-child td:nth-child(7) label "Match Score"
23. log text from selector .ant-table-tbody tr:first-child td:nth-child(8) label "Expiry"
24. log text from selector .ant-table-tbody tr:first-child td:nth-child(9) label "Created At"
25. log section "After Trigger Invitation Data"

26. force click on selector .ant-table-tbody tr:first-child .ant-dropdown-trigger
27. wait 2 seconds

28. click on selector .ant-dropdown-menu-title-content:has-text("Trigger Invite")
29. wait 2 seconds
30. wait for selector .ant-modal-content
31. triple click on selector .ant-modal-content .ant-input-number-input
32. type "10" in .ant-modal-content .ant-input-number-input
33. wait 1 second
34. click on selector .ant-modal-content button:has-text("Send Invite")
35. wait 3 seconds

## Verify Invite Triggered
36. wait for selector .ant-message-notice-content
37. log text from selector .ant-message-notice-content label "Invite Email Message"
38. wait 2 seconds

## Check Updated Status After Invite
39. wait for selector .ant-table-tbody tr
40. wait 2 seconds
41. log text from selector .ant-table-tbody tr:first-child td:nth-child(2) label "Candidate ID"
42. log text from selector .ant-table-tbody tr:first-child td:nth-child(3) label "Candidate Name"
43. log text from selector .ant-table-tbody tr:first-child td:nth-child(4) label "Email ID"
44. log text from selector .ant-table-tbody tr:first-child td:nth-child(5) label "Application Status"
45. log text from selector .ant-table-tbody tr:first-child td:nth-child(6) label "Interview Status"
46. log text from selector .ant-table-tbody tr:first-child td:nth-child(7) label "Match Score"
47. log text from selector .ant-table-tbody tr:first-child td:nth-child(8) label "Expiry"
48. log text from selector .ant-table-tbody tr:first-child td:nth-child(9) label "Created At"

## Screenshot
49. take screenshot
