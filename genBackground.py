import cv2
import numpy as np

bgImg = cv2.imread("captcha1_data/0.png")

for i in xrange(100):
    img = cv2.imread("captcha1_data/%d.png" % i)
    bgImg = cv2.max(bgImg, img)

cv2.imwrite("bgImg.png", bgImg)
