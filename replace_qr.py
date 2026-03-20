with open('src/components/layout/Navbar.tsx', 'r') as f:
    content = f.read()

old1 = '<QRPlaceholder label="微信" color="#07C160" />'
new1 = '<img src={WECHAT_QR} alt="微信群二维码" style={{ width: "112px", height: "112px", borderRadius: "8px" }} />'

old2 = '<QRPlaceholder label="TG" color="#229ED9" />'
new2 = '<img src={TELEGRAM_QR} alt="Telegram群二维码" style={{ width: "112px", height: "112px", borderRadius: "8px" }} />'

content = content.replace(old1, new1)
content = content.replace(old2, new2)

with open('src/components/layout/Navbar.tsx', 'w') as f:
    f.write(content)

print("替换成功")