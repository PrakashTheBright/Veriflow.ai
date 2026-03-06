# Create Assessment Flow - Executable Version

## Login
1. navigate to ${APP_URL}
2. click on toggle switch
3. wait 1 second
4. enter username/email ${APP_USERNAME}
5. enter password ${APP_PASSWORD}
6. click on "Sign In"
7. wait 5 seconds

## Create Assessment
8. wait for selector button:has-text("Create Assessment")
9. click on "Create Assessment"
10. wait 3 seconds

## Job Description Analysis
11. type "Software Engineer" in .ant-input:first-of-type
12. wait 1 second
13. type "We are looking for a Java Developer with 3+ years of experience in Spring Boot, REST APIs, and microservices. The candidate should have strong problem-solving skills and experience with CI/CD pipelines." in textarea.ant-input
14. wait 2 seconds
15. click on "Analyze"
16. wait 5 seconds

## Fill Job Details - Location and CTC (required fields after AI auto-fills)
17. wait for selector input[placeholder*="ocation"]
18. type "Pune" in input[placeholder*="ocation"]
19. wait 1 second
20. type "1200000" in input[placeholder*="nnual"]
21. wait 2 seconds
22. wait for selector button:has-text("Next"):not([disabled])
23. click on "Next"
24. wait 3 seconds

## Resume Section
25. click on "Resume File"
26. wait 2 seconds
27. upload file "c:\Users\Prakash Shinde\OneDrive - Prismforce India Private Limited\Desktop\SelectPrism Docs\prakash_Shinde_4yrs_EXP.docx"
28. click on "Upload"
29. wait 5 seconds
30. click on .ant-checkbox-input
31. wait 2 seconds
32. click on "Save & Add to Assessment"
33. wait 2 seconds
34. click on "Next"

## Interview Configuration - Question Selection
35. wait 5 seconds

### Select HR Questions using Select All checkbox (HR tab is already selected by default)
36. click on "Select All"
37. wait 500ms
38. wait 1 second

### Click Technical Tab and Set 4 Questions
39. click on "Technical"
40. wait 5 seconds
41. wait for selector .ant-spin-spinning to be hidden
42. wait 2 seconds
43. click on .ant-input-number-input
44. wait 500ms
45. press Ctrl+A
46. type "4" in .ant-input-number-input
47. wait 500ms
48. click on "Select All"
49. wait 2 seconds

### Click Coding Tab and Set 5 Questions
50. click on "Coding"
51. wait 5 seconds
52. wait for selector .ant-spin-spinning to be hidden
53. wait 5 seconds
54. click on .ant-input-number-input >> nth=1
55. wait 500ms
56. press Ctrl+A
57. type "5" in .ant-input-number-input >> nth=1
58. wait 500ms
59. click on "Select All"
60. wait 2 seconds
61. click on "Next"

## Send Invite
62. wait 5 seconds
63. click on .ant-checkbox-input
64. wait 2 seconds
65. click on button:has-text("Send Invite")
66. wait 5 seconds
67. take screenshot
