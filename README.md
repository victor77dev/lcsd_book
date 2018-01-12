# lcsd_book
lcsd booking
### captcha1.py
Recognize first captcha

### decodeResponse.html
Decode response from https://t2.leisurelink.lcsd.gov.hk/lcsd/leisurelink/facilityBooking.do request

### download_captcha1.sh
Download 100 captcha1 images for generating background

### genBackground.py
Extract background for captcha1 from 100 downloaded images

### checkBooking.js
Check the booking status

### requestCourtList.json
List all the requests form data for different courts (TODO: need to fill in all the combinations)

### example.js
Contains example of calling captcha1 and decodeResponse

## To Do
1. Fill in requestCourtList.json
2. Improvement on captcha1 accuracy
3. Unknown bug(issue): request of getting court info may fail even the cookies are correct

## Installation
### Requirement
python, opencv, nodejs, pytesseract are required
### To install nodejs libraries
npm install
### To run
node checkBooking.js
