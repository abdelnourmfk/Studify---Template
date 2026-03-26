UPDATE users SET password = E'$2a$12$1bpBuTqKHuon/cbSCXTpq.C9YRtWSQQjIdIH0kaYatpQ99t537RVa' WHERE LOWER(email) IN ('abdelnourmfk@gmail.com', 'bentatareda@gmail.com');
SELECT email, password FROM users WHERE LOWER(email) IN ('abdelnourmfk@gmail.com', 'bentatareda@gmail.com');
