mkdir -p captcha1_data
for i in {0..99}
do
    curl -s 'http://w1.leisurelink.lcsd.gov.hk/leisurelink/image?a=0.3428009780964344'  'Accept-Encoding: gzip, deflate' -H 'Accept-Language: en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7,zh-CN;q=0.6' -H 'Upgrade-Insecure-Requests: 1' -H 'User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36' -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8' -H 'Cache-Control: max-age=0' -H 'Connection: keep-alive' --compressed > captcha1_data/$i.png
    echo "downloaded img$i"
done
