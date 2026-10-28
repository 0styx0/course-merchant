
 
### Creating courses

When the admin goes to the course creation page
Then they can create a course title of up to 100 characters
And a course summary of up to 300 chars, about 2-3 sentences
And a course description of up to 5,000 characters of text, written in a visual editor (bold, italic, underline, strikethrough, headings, bulleted and numbered lists up to 3 levels, quotes, horizontal rules, links)
And pasting from Google Docs keeps that formatting, and drops what the editor doesn't support
And the admin sees how many characters they have used out of 5,000
And the course has a content link (https), which is never shown to the public
And they can specify a future start time
And they can specify a future end time greater than start time
And they can specify a valid time zone
And they can set a price schedule in USD: one or more prices, each with the time it takes effect (empty means when saved)
And they must choose a course image (JPEG, PNG or WebP, up to 5 MB, at least 800×450)
And all fields should be required

When the admin chooses an image
Then they see it in a 16:9 frame, cropped around its centre, the same way the public pages will show it
And if the file is too large, too small or not JPEG/PNG/WebP, they see the error before submitting

When the admin saves a new course
Then it is created as a draft, then the image is uploaded, then the course is published if they chose to
And if the image upload fails, the course stays a draft and the admin can upload the image again

When the admin tries to publish a course that has no image
Then they see an error asking them to upload an image first

When the user sets a price
Then the price must be 0 (free) or at least fifty cents

When the user sets a price above 0 and below fifty cents
Then the user should see an error like 'payment processor requires courses at least fifty cents, or enter 0 for a free course'

When the user picks a start or end time that a daylight-saving change skips or repeats in the chosen time zone
Then they see an error asking them to choose another time

When the admin saves a valid new course
Then they go to the home page (the course is a draft, so it isn't listed there)

When the start/end time is specified
Then the user can see the total time of the event

When the user sets the price
Then they can see the price - expected payment processing fees

When the page loads
Then the default currency should be USD
And the default time zone should be america/new york

When the user fixes a field they have already left
Then its message updates on every keystroke

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
And length requirements for title, summary and details should be validated
And start/end times should be in the future
And end time should be greater than start time
And all fields should be ensured to exist

### Editing a course

When the admin wants to edit a course
Then they see the course's current image
And they can choose a new one, previewed the same way
And if they don't choose one, the current image is kept

When the admin views the course list
Then courses without an image are marked "missing image"