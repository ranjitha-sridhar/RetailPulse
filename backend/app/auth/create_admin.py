
from getpass import getpass

from .database import (
    initialize_database,
    get_user_by_username,
    get_user_by_email,
    create_user
)
from .security import hash_password


def main():
    initialize_database()

    print("=== RetailPulse Admin Setup ===")

    username = input("Admin username: ").strip()
    email = input("Admin email: ").strip()
    password = getpass("Admin password: ")
    confirm = getpass("Confirm password: ")

    if len(username) < 3:
        print("Username must contain at least 3 characters.")
        return

    if "@" not in email or "." not in email.split("@")[-1]:
        print("Enter a valid email address.")
        return

    if len(password) < 12:
        print("Admin password must contain at least 12 characters.")
        return

    if password != confirm:
        print("Passwords do not match.")
        return

    if get_user_by_username(username) or get_user_by_email(email):
        print("Username or email already exists.")
        return

    user_id = create_user(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        role="admin"
    )

    print(f"Admin account created successfully! User ID: {user_id}")


if __name__ == "__main__":
    main()
