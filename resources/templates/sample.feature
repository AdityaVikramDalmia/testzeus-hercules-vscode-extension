Feature: Google Search

Scenario: Search for TestZeus on Google
  Given I open a browser
  When I navigate to "https://www.google.com"
  And I enter "TestZeus Hercules" in the search box
  And I click the search button
  Then I should see search results for "TestZeus Hercules" 