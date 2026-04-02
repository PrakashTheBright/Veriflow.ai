# Create Assessment

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

## Fill Job Details - Location and CTC
17. wait for selector input[placeholder*="ocation"]
18. type "Pune" in input[placeholder*="ocation"]
19. wait 1 second
20. type "1200000" in input[placeholder*="nnual"]
21. wait 2 seconds
22. wait for selector button:has-text("Next"):not([disabled])
23. click on "Next"
24. wait 3 seconds

## Interview Configuration - Question Selection
25. wait 5 seconds

### HR Questions
26. click on "Select All"
27. wait 1 second

### Technical Questions
28. click on "Technical"
29. wait 5 seconds
30. wait for selector .ant-spin-spinning to be hidden timeout 120000
31. wait 2 seconds
32. click on .ant-input-number-input
33. wait 500ms
34. press Ctrl+A
35. type "4" in .ant-input-number-input
36. wait 5 seconds
37. click on "Select All"
38. wait 2 seconds

### Coding Questions
39. click on "Coding"
40. wait 5 seconds
41. wait for selector .ant-spin-spinning to be hidden timeout 120000
42. wait 2 seconds
43. click on .ant-input-number-input >> nth=1
44. wait 500ms
45. press Ctrl+A
46. type "5" in .ant-input-number-input >> nth=1
47. wait 5 seconds
48. click on "Select All"
49. wait 2 seconds

## Save Assessment
50. click on "Save"
51. wait 2 seconds

## Screenshot
52. take screenshot
