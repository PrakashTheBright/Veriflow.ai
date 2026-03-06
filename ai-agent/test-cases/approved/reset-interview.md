# Reset Interview Flow

## Objective
Identify candidates with **Interrupted**, **In Progress**, or **Interview Expired** status and reset the interview for the first matching candidate.

## Login
1. navigate to ${APP_URL}
2. click on toggle switch
3. wait 1 second
4. enter username/email ${APP_USERNAME}
5. enter password ${APP_PASSWORD}
6. click on "Sign In"
7. wait 5 seconds

## View Candidates
8. wait 5 seconds
9. wait for selector role=button[name="ellipsis"]
10. force click on selector role=button[name="ellipsis"]
11. wait 1 second
12. click on selector .ant-dropdown-menu-title-content:has-text("View Candidates")
13. wait 3 seconds

## Wait for Candidates Table
14. wait for selector .ant-table-tbody
15. wait 5 seconds
16. wait for selector .ant-table-tbody tr
17. wait 3 seconds
18. take screenshot

## Find Candidate with Eligible Status and Reset Interview
19. reset candidate by status "Interrupted" otherwise continue
20. reset candidate by status "Interview Expired" otherwise continue
21. reset candidate by status "In Progress" otherwise continue
22. log "No candidate has Interrupted, In Progress, or Interview Expired status" label "Status Check"

## Verify Reset Interview Success
23. take screenshot
