Feature: REST API Testing

Scenario: Test a GET request
  Given I have an API endpoint "https://jsonplaceholder.typicode.com/todos/1"
  When I send a GET request
  Then the response status code should be 200
  And the response should contain "userId"
  And the response should contain "title"

Scenario: Test a POST request
  Given I have an API endpoint "https://jsonplaceholder.typicode.com/posts"
  And I have the following request body:
    """
    {
      "title": "Test Post",
      "body": "This is a test post",
      "userId": 1
    }
    """
  When I send a POST request
  Then the response status code should be 201
  And the response should contain "id" 