# VeriFlow AI - Login Credentials

## Default Accounts

### Admin Account
- **Email**: `admin@veriflow.ai`
- **Username**: `admin`
- **Password**: `admin123`

### Test Account
- **Email**: `test@veriflow.ai`
- **Username**: `test`
- **Password**: `test1234`

## Usage

You can login using either:
1. **Email + Password**
2. **Username + Password**

Example:
- Login with: `admin@veriflow.ai` and `admin123`
- Or login with: `admin` and `admin123`

## Reset Database

To reset the database and recreate the default users:

```bash
npm run db:seed
```

## Notes

- Passwords are hashed using bcrypt with 12 rounds
- Sessions expire after 7 days
- Both username and email can be used for login
