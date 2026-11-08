"""Sahte Instagram veri ZIP'leri üretir (testler için).
instagram-test.zip   : 860 takip, 576 takipçi, 1 bekleyen istek (2024+ "title" formatı karışık)
instagram-test-2.zip : aynı takip; 30 takipçi kaybolmuş, 10 yeni takipçi (takipten çıkanlar testi)
"""
import json, zipfile, random, time
random.seed(1); now = int(time.time())
users = [f"user_{i:03d}" for i in range(860)]
following = {"relationships_following": []}
for i, u in enumerate(users):
    ts = now - random.randint(1, 2000) * 86400
    if i % 2:
        following["relationships_following"].append({"title": u, "string_list_data": [{"href": f"https://www.instagram.com/_u/{u}", "timestamp": ts}]})
    else:
        following["relationships_following"].append({"title": "", "string_list_data": [{"href": f"https://www.instagram.com/{u}", "value": u, "timestamp": ts}]})
fol = [u for u in users if random.random() < 0.62][:600] + [f"fan_{i}" for i in range(40)]
followers = [{"title": "", "string_list_data": [{"href": f"https://www.instagram.com/{u}", "value": u, "timestamp": now}]} for u in fol]
req = {"relationships_follow_requests_sent": [{"title": "", "string_list_data": [{"href": "https://www.instagram.com/gizli_hesap", "value": "gizli_hesap", "timestamp": now - 86400 * 90}]}]}
d = "connections/followers_and_following/"
with zipfile.ZipFile("instagram-test.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr(d + "following.json", json.dumps(following))
    z.writestr(d + "followers_1.json", json.dumps(followers))
    z.writestr(d + "pending_follow_requests.json", json.dumps(req))
    z.writestr("media/posts/big.jpg", b"x" * 200000)
lost = set([u for u in fol if u.startswith("user_")][:30])
fol2 = [e for e in followers if e["string_list_data"][0]["value"] not in lost] + [{"title": "", "string_list_data": [{"href": "x", "value": f"newfan_{i}", "timestamp": now}]} for i in range(10)]
with zipfile.ZipFile("instagram-test-2.zip", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr(d + "following.json", json.dumps(following))
    z.writestr(d + "followers_1.json", json.dumps(fol2))
print("instagram-test.zip ve instagram-test-2.zip oluşturuldu")
