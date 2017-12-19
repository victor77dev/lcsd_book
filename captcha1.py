import sys
import cv2
import numpy as np
import subprocess
import tempfile
import os
import pytesseract
from PIL import Image

directory = "debug"
if not os.path.exists(directory):
    os.makedirs(directory)

def image_to_text(inputImg, ver=2):
    img = cv2.imread(inputImg)
    bgImg = cv2.imread("bgImg.png")
    testing = bgImg -img
    testingGray = cv2.cvtColor(testing, cv2.COLOR_BGR2GRAY)
    _, testingGray = cv2.threshold(testingGray, 127, 255, 0)

    if ver == 2:
        imgForContour = testingGray.copy()
        _, contours, hierarchy = cv2.findContours(imgForContour, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        for i in xrange(len(contours)):
            cnt = contours[i]
            if cv2.contourArea(cnt) < 25:
                cv2.fillPoly(testingGray, pts=[cnt], color=(255,255,255))


    kernel = np.ones((3,3),np.uint8)
    testingGray = cv2.dilate(testingGray, kernel)

    if ver == 1 or ver == 2:
        testingGray = cv2.erode(testingGray, kernel)

    cv2.imwrite(directory + "/ver%d/%s" % (ver, os.path.basename(inputImg)), testingGray)
    #cv2.imshow('text', testingGray)
    #cv2.waitKey(0)

    tempFile = tempfile.NamedTemporaryFile(dir=directory, prefix="input",suffix=".png")
    tempFile.close()
    cv2.imwrite(tempFile.name, testingGray)

    outputText = pytesseract.image_to_string(Image.open(tempFile.name), lang='eng', config='-psm')
    os.remove(tempFile.name)

    return outputText.strip().encode('utf-8')

#for version in [2]:
#    file = open("output%d.txt" % version,"w")
#
#    for i in xrange(100):
#        result = image_to_text("output/%d.png" % i, ver=version)
#        result = result.replace(" ","")
#        print("%d:%s" % (i, result))
#        file.write("%d:%s\n" % (i, result.strip()))
#    file.close()

if __name__ == "__main__":
    print(image_to_text(sys.argv[1], ver=2))
