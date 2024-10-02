import { test, expect } from '@playwright/test';

const siteAddress = 'http://localhost:3000';
const adminUser = {
  userName: 'admin',
  password: 'a12345',
};

const testUser = {
  first_name: 'Test First Name',
  last_name: 'Test Last Name',
  username: 'testcreator',
  password: 'a12345678',
  email: 'testcreator@dei.gr',
  mobilePhone: '6933403135',
};

const userNameHeader = 'User Name';

const columnsOnUsersTable = 12;

test('Test Creation of New User', async ({ page }) => {
  await page.goto(siteAddress);

  await loginToPage({ page, adminUser });

  await goToUsersPage({ page });

  // Wait until selector can be found
  await page.waitForSelector("//div[@id='pagination']");

  // Check if user already exists
  const user = await CheckIfUserAlreadyExists({
    page,
    userNameHeader,
    testUser,
  });

  // If user doesnt exist, then create the user
  if (!user.found) {
    await createNewUser({ page, testUser });
  }

  // If user already exists then delete and re-create the user
  if (user.found) {
    await deleteUser({ page, existingUser: user });
    await createNewUser({ page, testUser });
  }

  // Expect The user to be found
  const myUser = await CheckIfUserAlreadyExists({
    page,
    userNameHeader,
    testUser,
  });

  expect(myUser.found).toBe(true);
  await deleteUser({ page, existingUser: user });
});

const goToUsersPage = async ({ page }) => {
  await page.getByRole('button', { name: 'Users List' }).click();
};

const loginToPage = async ({ page }) => {
  await page.getByPlaceholder('User Name').click();
  await page.getByPlaceholder('User Name').fill(adminUser.userName);
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').fill(adminUser.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForSelector('.loggedInUserName');

  const loggedInUserName = await page
    .locator('.loggedInUserName')
    .textContent();
  expect(loggedInUserName).toBe(adminUser.userName);
};

const CheckIfUserAlreadyExists = async ({ page, userNameHeader, testUser }) => {
  // Table Locator
  const table = await page.locator('table');

  // Flag to check if the user is found
  let user = {
    userName: testUser.username,
    found: false,
    page: null,
    row: null,
  };

  expect(await page.url()).toBe(`${siteAddress}/admin`);

  // Locate the Pagination Buttons
  const pages = await page.locator(
    "//div[@id='pagination']//div[not(svg) and number(text()) >= 1] | //div[@id='pagination']//button[number(text()) >= 1]"
  );

  // Get Rows & Columns of Users Table
  const columns = await table.locator('thead tr th');
  expect(await columns.count()).toBe(columnsOnUsersTable);

  // Get the index of the column that contains "User Name"
  let userNameColumnIndex = -1;
  for (let i = 0; i < (await columns.count()); i++) {
    const columnText = await columns.nth(i).innerText();
    if (columnText.trim() === userNameHeader) {
      userNameColumnIndex = i;
      break;
    }
  }

  // Throw an error if the "User Name" column is not found
  if (userNameColumnIndex === -1) {
    throw new Error(`Column with header "${userNameHeader}" not found.`);
  }

  const rows = await table.locator('tbody tr');

  // Read data for all Pages
  for (let p = 0; p < (await pages.count()); p++) {
    if (p > 0) {
      await pages.nth(p).click();
    }

    for (let i = 0; i < (await rows.count()); i++) {
      const row = rows.nth(i);
      const tds = row.locator('td');

      for (let j = 0; j < (await tds.count()) - 1; j++) {
        if (j === userNameColumnIndex - 1) {
          const userNameFromList = await tds.nth(j).textContent();
          if (testUser.username === userNameFromList) {
            user = {
              ...user,
              found: true,
              page: p + 1,
              row: i + 1,
            };
            break;
          }
        }
      }
      if (user.found) break; // Break outer loop if found
    }
    if (user.found) break; // Break pagination loop if found
  }

  return user;
};

const createNewUser = async ({ page, testUser }) => {
  console.log('Creating new Test user');

  await page.getByRole('button', { name: 'Create User' }).click();
  await page.locator('select[name="company"]').selectOption('-1');
  await page.locator('input[name="first_name"]').click();
  await page.locator('input[name="first_name"]').fill(testUser.first_name);
  await page.locator('input[name="first_name"]').press('Tab');
  await page.locator('input[name="last_name"]').fill(testUser.last_name);
  await page.locator('input[name="last_name"]').press('Tab');
  await page.locator('input[name="username"]').fill(testUser.username);
  await page.locator('input[name="username"]').press('Tab');
  await page.locator('input[name="password"]').fill(testUser.password);
  await page.locator('input[name="password"]').press('Tab');
  await page.locator('input[name="email"]').fill(testUser.email);
  await page.locator('select[name="company"]').selectOption('1');
  await page.locator('input[name="mobile_phone"]').click();
  await page.locator('input[name="mobile_phone"]').fill(testUser.mobilePhone);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.waitForTimeout(2000);
};

const deleteUser = async ({ page, existingUser }) => {
  console.log('Deleting existing Test user');

  expect(await page.url()).toBe(`${siteAddress}/admin`);

  const pageNumber = existingUser.page;

  // Wait for the active pagination button to be visible
  const activePaginationButton = await page.locator(
    "//div[@id='pagination']//div[contains(@class, 'bg-blue-600')]"
  );

  const activePageNumber = await activePaginationButton.textContent();

  if (Number(activePageNumber) === pageNumber) {
    const rowOfUser = await page.locator('tbody tr').nth(existingUser.row - 1);
    const deleteUserButton = await rowOfUser.getByRole('button').nth(4).click();
    // await page.getByText('User Name: testcreator').click();

    // Wait for the modal to be visible
    await page.waitForSelector('div.fixed.inset-0.flex');

    // Verify the <h3> contains the words "Delete User"
    const modalTitle = await page.locator('h3').textContent();
    expect(modalTitle).toContain('Delete User');

    // Verify the User Name is "testcreator"
    const userName = await page
      .locator(
        "//ul[contains(@class, 'flex')]//li[contains(text(), 'User Name')]"
      )
      .textContent();
    expect(userName).toContain(testUser.username);

    // Press the "Confirm" button
    await page.locator('button:has-text("Confirm")').click();

    await page.waitForTimeout(2000);

    const user = await CheckIfUserAlreadyExists({
      page,
      userNameHeader,
      testUser,
    });

    expect(user.found).toBe(false);
  }
};
