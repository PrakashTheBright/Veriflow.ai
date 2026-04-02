# End-to-End Flow

## Login
1. navigate to ${APP_URL}
2. click on toggle switch
3. wait 1 second
4. enter username/email ${APP_USERNAME}
5. enter password ${APP_PASSWORD}
6. click on "Sign In"
7. wait 5 seconds

---

# Create Assessment

## Open Create Assessment
8. wait for selector button:has-text("Create Assessment")
9. click on "Create Assessment"
10. wait 3 seconds

## Job Description Analysis
11. type "Software Engineer" in .ant-input:first-of-type
12. wait 1 second
13. type "We are looking for a Java Developer with 3+ years of experience in Spring Boot, REST APIs, and microservices. The candidate should have strong problem-solving skills and experience with CI/CD pipelines." in textarea.ant-input
14. wait 2 seconds
15. click on "Analyze"
16. wait for selector .ant-spin-spinning to be hidden timeout 120000

## Fill Job Details
17. wait for selector input[placeholder*="ocation"]
18. type "Pune" in input[placeholder*="ocation"]
19. wait 1 second
20. type "1200000" in input[placeholder*="nnual"]
21. wait 2 seconds
22. wait for selector button:has-text("Next"):not([disabled])
23. click on "Next"
24. wait 3 seconds

## Interview Configuration

### HR Questions
25. click on selector .ant-checkbox-wrapper:has-text("Select All")
26. wait 1 second

### Technical Questions
27. click on "Technical"
28. wait for selector .ant-spin-spinning to be hidden timeout 120000
29. click on .ant-input-number-input
30. press Ctrl+A
31. type "4" in .ant-input-number-input
32. click on selector .ant-checkbox-wrapper:has-text("Select All")
33. wait 2 seconds

### Coding Questions
34. click on "Coding"
35. wait for selector .ant-spin-spinning to be hidden timeout 120000
36. click on selector .ant-input-number-input >> nth=1
37. press Ctrl+A
38. type "5" in .ant-input-number-input >> nth=1
39. click on selector .ant-checkbox-wrapper:has-text("Select All")
40. wait 2 seconds

## Save Assessment
41. click on "Save"
42. wait for selector .ant-message-notice-content timeout 10000
43. wait 3 seconds

---

# Navigate to Candidate Module

44. wait for selector .ant-menu-title-content:has-text("Candidates")
45. force click on selector .ant-menu-title-content:has-text("Candidates")
46. wait 5 seconds

---

# Add Candidate

47. wait for selector button:has-text("Add Candidates")
48. click on "Add Candidates"
49. wait 3 seconds

## Upload Resume
50. click on "Resume File"
51. wait 2 seconds
52. upload file "C:\Users\Prismforce_ai\OneDrive - Prismforce India Private Limited\Desktop\SelectPrism Docs\prakash_Shinde_4yrs_EXP.docx"
53. click on "Upload"
54. wait for selector .ant-table-tbody tr:has-text("Uploaded") timeout 120000
55. wait 2 seconds

## Commit Candidate
56. click on selector .ant-table-tbody .ant-table-selection-column .ant-checkbox-wrapper
57. wait 2 seconds
58. wait for selector button:has-text("Commit Candidates"):not([disabled])
59. click on "Commit Candidates"
60. wait for selector .ant-table-tbody tr:has-text("Committed") timeout 120000
61. wait 2 seconds

---

# Add Candidate to Assessment

62. click on selector .ant-table-tbody .ant-table-selection-column .ant-checkbox-wrapper
63. wait 2 seconds
64. wait for selector button:has-text("Add to Assessment")
65. click on "Add to Assessment"
66. wait 3 seconds

## Select Assessment
67. wait for selector .ant-modal-content
68. wait for selector .ant-modal-content .ant-table-tbody tr:first-child
69. force click on selector .ant-modal-content .ant-table-tbody tr:first-child td:first-child
70. wait 1 second
71. click on "Add"
72. wait 2 seconds

---

# Verify Success Message

73. wait for selector .ant-message-notice-content timeout 10000
74. log text from selector .ant-message-notice-content label "Popup Message"
75. wait 2 seconds

---

# Screenshot
76. take screenshot
