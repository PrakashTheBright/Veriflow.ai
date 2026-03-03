# Test Case Generator App - Setup Guide

## Overview

This document provides step-by-step instructions to create the **Create
Test Cases (Admin Only)** feature using:

-   React (Frontend)
-   Node.js + Express (Backend)
-   PostgreSQL (Database)
-   CSV generation

------------------------------------------------------------------------

# Step 1: Create Project Folder

``` bash
mkdir testcase-generator-app
cd testcase-generator-app
```

------------------------------------------------------------------------

# Step 2: Setup Backend

``` bash
mkdir backend
cd backend
npm init -y
npm install express cors multer json2csv pg dotenv
npm install nodemon --save-dev
```

## Create Folder Structure

``` bash
mkdir routes controllers models middleware uploads utils
touch server.js .env
```

## Update package.json

``` json
"scripts": {
  "dev": "nodemon server.js"
}
```

## server.js

``` javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
```

Run backend:

``` bash
npm run dev
```

------------------------------------------------------------------------

# Step 3: Setup PostgreSQL

``` sql
CREATE DATABASE testcase_app;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  password VARCHAR(100),
  role VARCHAR(20)
);

INSERT INTO users (name, email, password, role)
VALUES ('Admin User', 'admin@test.com', 'admin123', 'ADMIN');
```

------------------------------------------------------------------------

# Step 4: Setup Frontend

``` bash
cd ..
npx create-react-app frontend
cd frontend
npm install axios react-router-dom
```

Create folders:

``` bash
mkdir src/pages src/components
touch src/pages/CreateTestCases.js
```

## CreateTestCases.js

``` javascript
import React, { useState } from "react";
import axios from "axios";

function CreateTestCases() {
  const [fileName, setFileName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);

  const handleGenerate = async () => {
    if (!description && !file) {
      alert("Provide description or upload file");
      return;
    }

    const response = await axios.post(
      "http://localhost:5000/api/generate-testcases",
      {
        selectedFields: [
          "Test Case ID",
          "Module",
          "Scenario",
          "Pre Condition",
          "Test Steps",
          "Test Data",
          "Expected Result",
          "Actual Result",
          "Status",
          "Priority",
          "Severity",
          "Environment",
          "Comments"
        ]
      }
    );

    alert(response.data.message);
  };

  return (
    <div>
      <h2>Create Test Cases</h2>

      <input
        type="text"
        placeholder="Test Case File Name"
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
      />

      <textarea
        placeholder="Test Case Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        type="file"
        accept=".doc,.docx,.pdf,.xls,.xlsx"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button onClick={handleGenerate}>
        Generate Test Cases
      </button>
    </div>
  );
}

export default CreateTestCases;
```

------------------------------------------------------------------------

# Step 5: CSV Generation Controller

Create:

``` bash
touch backend/controllers/testcaseController.js
```

``` javascript
const { Parser } = require('json2csv');
const fs = require('fs');

exports.generateTestCases = (req, res) => {
  const fields = req.body.selectedFields;

  const testCases = [
    {
      "Test Case ID": "TC_001",
      "Module": "Login",
      "Scenario": "Valid Login",
      "Pre Condition": "User registered",
      "Test Steps": "Enter credentials",
      "Test Data": "admin/admin123",
      "Expected Result": "Login success",
      "Actual Result": "",
      "Status": "",
      "Priority": "High",
      "Severity": "Critical",
      "Environment": "QA",
      "Comments": ""
    }
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(testCases);

  fs.writeFileSync("generated_testcases.csv", csv);

  res.json({
    message: "Test cases generated",
    file: "generated_testcases.csv"
  });
};
```

------------------------------------------------------------------------

# Step 6: Run Application

Backend:

``` bash
cd backend
npm run dev
```

Frontend:

``` bash
cd frontend
npm start
```

------------------------------------------------------------------------

# Feature Summary

-   Admin-only Create Test Cases tab
-   Text input for file name
-   Description or file upload option
-   Template field selection
-   CSV file generation
-   View and download options
