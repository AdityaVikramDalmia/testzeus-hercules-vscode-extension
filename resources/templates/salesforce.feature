Feature: Account Creation in Salesforce

Scenario: Successfully create a new account
  Given I am on the Salesforce login page
  When I enter my username "user@example.com" and password "securePassword"
  And I click on the "Log In" button
  And I navigate to the "Accounts" tab
  And I click on the "New" button
  And I fill in the "Account Name" field with "Test Account"
  And I select the "Account Type" as "Customer"
  And I fill in the "Website" field with "www.testaccount.com"
  And I fill in the "Phone" field with "123-456-7890"
  And I click on the "Save" button
  Then I should see a confirmation message "Account Test Account created successfully"
  And I should see "Test Account" listed in the account records 