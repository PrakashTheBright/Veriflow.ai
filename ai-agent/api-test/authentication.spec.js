// const { test, expect, request } = require('@playwright/test');

// // Constants
// const BASE_URL = 'https://pf.pfsit.xyz';
// const LOGIN_ENDPOINT = '/selectprism/login';
// const TEST_CREDENTIALS = {
//   email: 'testuser11@gmail.com',
//   password: '@!agent_123',
// };

// /**
//  * Extract Next.js Server Action ID from login page
//  */
// async function getServerActionId(context) {
//   const response = await context.get(LOGIN_ENDPOINT);
//   const html = await response.text();
  
//   // Try multiple extraction patterns
//   const patterns = [
//     /action:\s*["']([a-f0-9]{40,})["']/i,
//     /next-action["']\s*:\s*["']([a-f0-9]{40,})["']/i,
//     /"([a-f0-9]{40,})"/,  // Generic 40+ char hex string
//     /formAction:\s*["']([a-f0-9]{40,})["']/i,
//     /__next_action__:\s*["']([a-f0-9]{40,})["']/i
//   ];
  
//   for (const pattern of patterns) {
//     const match = html.match(pattern);
//     if (match) {
//       console.log('Found action ID with pattern:', pattern);
//       return match[1];
//     }
//   }
  
//   // Debug: Save HTML snippet to see structure
//   console.log('HTML snippet (first 1000 chars):', html.substring(0, 1000));
//   console.log('\nSearching for action-related strings:', 
//     html.includes('action') ? 'Found "action"' : 'No "action"',
//     html.includes('formAction') ? 'Found "formAction"' : 'No "formAction"'
//   );
  
//   throw new Error('Unable to extract Server Action ID from page');
// }

// async function doAuthentication() {
//   const context = await request.newContext({ baseURL: BASE_URL });

//   // Get session cookies and extract Server Action ID
//   const actionId = await getServerActionId(context);
//   console.log('Extracted Action ID:', actionId);

//   // Perform Next.js Server Action authentication
//   const response = await context.post(LOGIN_ENDPOINT, {
//     headers: {
//       'accept': 'text/x-component',
//       'accept-language': 'en-US,en;q=0.9',
//       'content-type': 'text/plain;charset=UTF-8',
//       'next-action': actionId,
//       'next-router-state-tree': '%5B%22%22%2C%7B%22children%22%3A%5B%22login%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fselectprism%2Flogin%22%2C%22refresh%22%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D',
//       'origin': BASE_URL,
//       'referer': `${BASE_URL}${LOGIN_ENDPOINT}`,
//       'sec-fetch-dest': 'empty',
//       'sec-fetch-mode': 'cors',
//       'sec-fetch-site': 'same-origin',
//     },
//     data: JSON.stringify([TEST_CREDENTIALS]),
//   });

//   return response;
// }

// test.describe('Authentication API Tests', () => {
//   test('should authenticate user successfully', async () => {
//     const response = await doAuthentication();

//     const status = response.status();
//     const responseText = await response.text();
    
//     console.log('Status:', status);
//     console.log('Response:', responseText.substring(0, 200));

//     // Verify response status
//     expect(status).toBe(200);
//     expect(responseText).toBeTruthy();
//   });
// });
