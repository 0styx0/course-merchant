
 
### Creating courses

When the admin goes to the course creation page
Then they can create a course title of up to 100 characters
And a course description of up to 5,000 chars
And they can specify a future start time
And they can specify a future end time greater than start time
And they can specify a valid time zone
And they can set a price in USD
And all fields should be required

When the user sets a price
Then the price must be above fifty cents

When the user sets a price to below fifty cents
Then the user should see an error like 'payment processor requires courses at least fifty cents'

When the start/end time is specified
Then the user can see the total time of the event

When the user sets the price
Then they can see the price - expected payment processing fees

When the page loads
Then the default currency should be USD
And the default time zone should be america/new york

When the user blurs a field
And the field contains invalid input
Then the user should see a red outline around the field
And next to the input they should see a red x
And underneath the field should display the error message

When the user blurs a field
And the field contains valid input
And next to the input they should see a green check mark

When the user attempts to submit the page with invalid data
Then the top of the page should display all error messages
And the user should be prevented from submitting the page to the server

When the user submits the page
Then all fields should be filled with valid data
And submissions should be disabled

When the server returns successfully created course
And the user should be redirected to the newly created course page

When the server returns with an error
Then the error should display at the page top
And submissions should be allowed again

----

When the page is submitted to the server
Then currency should be validated as an existent currency
And time zone should be validated as a valid time zone
And length requirements for title and details should be validated
And start/end times should be in the future
And end time should be greater than start time
And all fields should be ensured to exist

### Editing a course

When the admin wants to edit a course