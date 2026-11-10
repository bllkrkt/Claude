"""Arşivim testleri için gerçekçi sahte Instagram dışa aktarımı üretir.

arsiv-part1.zip : tüm JSON dosyaları + mesaj fotoğrafları (üst klasör: instagram-deneme_kullanici-2025-03-14-AbCd/)
arsiv-part2.zip : hikaye ve gönderi medyası (ikinci parça; çok parçalı arşiv testi)
Instagram'ın bozuk Türkçe kodlaması (UTF-8 baytlarının Latin-1 gibi yazılması) taklit edilir.
"""
import json, random, struct, time, zlib, zipfile

random.seed(7)
NOW = int(time.time())
DAY = 86400
PRE = "instagram-deneme_kullanici-2025-03-14-AbCd/"


def moji(s):
    """Instagram'ın yaptığı gibi: UTF-8 baytlarını tek tek karakter say."""
    return s.encode("utf-8").decode("latin-1")


def fix(o):
    if isinstance(o, str):
        return moji(o)
    if isinstance(o, list):
        return [fix(x) for x in o]
    if isinstance(o, dict):
        return {k: fix(v) for k, v in o.items()}
    return o


def J(o):
    return json.dumps(fix(o), indent=2)  # ensure_ascii → Ã gibi kaçışlar, tıpkı Instagram


def png(w, h, color):
    raw = b"".join(b"\x00" + bytes(color) * w for _ in range(h))
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


def col():
    return [random.randint(40, 230) for _ in range(3)]


ME = "Bilal Deneme"
friends = ["Ayşe Yılmaz", "Mehmet Öztürk", "Zeynep Çelik", "Emre Şahin", "Gülşen Ağaoğlu", "Can İnce", "Elif Doğan", "Burak Kılıç"]
words = "selam naber nasılsın iyiyim sen bugün yarın akşam maç kahve buluşalım tamam olur harika çok güzel şaka mı yapıyorsun 😂 ❤️ 🔥 👍 görüşürüz geliyorum yoldayım fotoğrafı attım bak şuna doğum günün kutlu olsun 🎉 teşekkürler".split()

part1, part2 = {}, {}
users = [f"kisi_{i:03d}" for i in range(320)]
following = {"relationships_following": [{"title": u, "string_list_data": [{"href": f"https://www.instagram.com/_u/{u}", "timestamp": NOW - random.randint(1, 2500) * DAY}]} for u in users[:260]]}
followers = [{"title": "", "string_list_data": [{"href": f"https://www.instagram.com/{u}", "value": u, "timestamp": NOW - random.randint(1, 2500) * DAY}]} for u in users[60:]]
C = "connections/followers_and_following/"
part1[C + "following.json"] = J(following)
part1[C + "followers_1.json"] = J(followers)
part1[C + "close_friends.json"] = J({"relationships_close_friends": [{"title": "", "string_list_data": [{"href": f"https://www.instagram.com/{u}", "value": u, "timestamp": NOW - 40 * DAY}]} for u in users[60:72]]})
part1[C + "blocked_profiles.json"] = J({"relationships_blocked_users": [{"title": "spam_hesap_1", "string_list_data": [{"href": "https://www.instagram.com/_u/spam_hesap_1", "timestamp": NOW - 300 * DAY}]}]})
part1[C + "following_hashtags.json"] = J({"relationships_following_hashtags": [{"title": "", "string_list_data": [{"href": "https://www.instagram.com/explore/tags/istanbul", "value": "istanbul", "timestamp": NOW - 900 * DAY}]}]})
part1[C + "pending_follow_requests.json"] = J({"relationships_follow_requests_sent": [{"title": "", "string_list_data": [{"href": "https://www.instagram.com/gizli_hesap", "value": "gizli_hesap", "timestamp": NOW - 60 * DAY}]}]})

# Kişisel bilgiler (Türkçe hesap dili → Türkçe anahtarlar, bozuk kodlamalı)
part1["personal_information/personal_information/personal_information.json"] = J({"profile_user": [{
    "media_map_data": {"Profil fotoğrafı": {"uri": "media/profile/202403/profil.png", "creation_timestamp": NOW - 200 * DAY, "title": ""}},
    "string_map_data": {"E-posta": {"href": "", "value": "deneme@example.com", "timestamp": 0}, "Kullanıcı adı": {"href": "", "value": "deneme_kullanici", "timestamp": 0},
                        "Ad": {"href": "", "value": ME, "timestamp": 0}, "Biyografi": {"href": "", "value": "📸 Fotoğraf · ☕ Kahve · İstanbul", "timestamp": 0},
                        "Cinsiyet": {"href": "", "value": "erkek", "timestamp": 0}, "Gizli hesap": {"href": "", "value": "True", "timestamp": 0}}}]})
part1["media/profile/202403/profil.png"] = png(64, 64, [124, 108, 255])

# Mesajlar
M = "your_instagram_activity/messages/inbox/"
for fi, f in enumerate(friends[:6]):
    folder = f.split()[0].lower().replace("ş", "s").replace("ç", "c").replace("ö", "o").replace("ü", "u").replace("ğ", "g").replace("ı", "i").replace("i̇", "i") + f"_{1000000000 + fi * 7919}"
    msgs, t = [], NOW - random.randint(400, 1500) * DAY
    n = random.randint(60, 900) if fi else 2600
    for k in range(n):
        t += random.randint(30, int(DAY * 1.2))
        if t > NOW:
            break
        m = {"sender_name": random.choice([ME, f]), "timestamp_ms": t * 1000, "is_geoblocked_for_viewer": False}
        r = random.random()
        if r < 0.05:
            name = f"{M}{folder}/photos/{k}.png"
            part1[name] = png(48, 36, col())
            m["photos"] = [{"uri": name, "creation_timestamp": t}]
        elif r < 0.07:
            m["share"] = {"link": "https://www.instagram.com/p/Cabc123/", "share_text": "Şuna bak çok komik 😂", "original_content_owner": random.choice(users)}
            m["content"] = f"{m['sender_name']} bir ek gönderdi."
        elif r < 0.08:
            m["call_duration"] = random.randint(10, 3000)
            m["content"] = "Sesli arama sona erdi"
        else:
            m["content"] = " ".join(random.choice(words) for _ in range(random.randint(1, 9)))
            if random.random() < 0.08:
                m["reactions"] = [{"reaction": "❤️", "actor": f}]
        msgs.append(m)
    msgs.reverse()  # Instagram yeniden eskiye yazar
    chunks = [msgs[i:i + 1000] for i in range(0, len(msgs), 1000)]
    for ci, ch in enumerate(chunks):
        part1[f"{M}{folder}/message_{ci + 1}.json"] = J({"participants": [{"name": f}, {"name": ME}], "messages": ch, "title": f, "is_still_participant": True, "thread_path": f"inbox/{folder}", "magic_words": []})
# Grup sohbeti
g = friends[2:7] + [ME]
gm = []
t = NOW - 300 * DAY
for k in range(400):
    t += random.randint(60, DAY // 2)
    gm.append({"sender_name": random.choice(g), "timestamp_ms": t * 1000, "content": " ".join(random.choice(words) for _ in range(random.randint(1, 7)))})
gm.reverse()
part1[M + "lise_kankalar_2233445566/message_1.json"] = J({"participants": [{"name": x} for x in g], "messages": gm, "title": "Lise Kankalar 🎓", "is_still_participant": True})
part1["your_instagram_activity/messages/message_requests/yabanci_5566778899/message_1.json"] = J({"participants": [{"name": "Yabancı Biri"}, {"name": ME}], "messages": [{"sender_name": "Yabancı Biri", "timestamp_ms": (NOW - 5 * DAY) * 1000, "content": "Merhaba, işbirliği yapalım mı?"}], "title": "Yabancı Biri"})

# Hikayeler, gönderiler, reels (medya ikinci parçada)
stories = []
for k in range(140):
    ts = NOW - random.randint(1, 1800) * DAY
    if k < 3:  # "bugün geçmişte" için geçen yıllarla aynı gün
        ts = int(time.mktime(time.localtime(NOW)[:0] or time.struct_time((time.localtime().tm_year - (k + 1), time.localtime().tm_mon, time.localtime().tm_mday, 14, 0, 0, 0, 0, -1))))
    ym = time.strftime("%Y%m", time.localtime(ts))
    uri = f"media/stories/{ym}/story_{k}.png"
    part2[uri] = png(36, 64, col())
    stories.append({"uri": uri, "creation_timestamp": ts, "media_metadata": {}, "title": random.choice(["", "", "Güzel bir gün ☀️", "Kahve molası ☕"])})
part1["your_instagram_activity/media/stories.json"] = J({"ig_stories": stories})
posts = []
for k in range(45):
    ts = NOW - random.randint(1, 2000) * DAY
    ym = time.strftime("%Y%m", time.localtime(ts))
    items = []
    for j in range(random.choice([1, 1, 1, 2, 3])):
        uri = f"media/posts/{ym}/post_{k}_{j}.png"
        part2[uri] = png(60, 60, col())
        items.append({"uri": uri, "creation_timestamp": ts, "title": "", "media_metadata": {}})
    posts.append({"media": items, "title": random.choice(["Hafta sonu 🌊", "Arkadaşlarla 🍕", "İstanbul'da gün batımı 🌇", ""]), "creation_timestamp": ts})
part1["your_instagram_activity/media/posts_1.json"] = J(posts)
part1["your_instagram_activity/media/profile_photos.json"] = J({"ig_profile_picture": [{"uri": "media/profile/202403/profil.png", "creation_timestamp": NOW - 200 * DAY, "title": ""}]})

# Beğeniler (2024+ label_values formatı) ve eski format
likes = []
for k in range(1200):
    u = random.choice(users)
    likes.append({"timestamp": NOW - random.randint(1, 1500) * DAY, "media": [], "label_values": [
        {"label": "URL", "value": f"https://www.instagram.com/p/X{k}/", "href": f"https://www.instagram.com/p/X{k}/"},
        {"dict": [{"dict": [{"label": "URL", "value": f"https://www.instagram.com/{u}"}, {"label": "Ad", "value": u.replace('_', ' ').title()}, {"label": "Kullanıcı adı", "value": u}], "title": ""}], "title": "Sahibi"}], "fbid": str(k)})
part1["your_instagram_activity/likes/liked_posts.json"] = J(likes)
part1["your_instagram_activity/likes/liked_comments.json"] = J({"likes_comment_likes": [{"title": u, "string_list_data": [{"href": f"https://www.instagram.com/p/Y{i}/", "value": "👍", "timestamp": NOW - i * DAY}]} for i, u in enumerate(users[:30])]})
part1["your_instagram_activity/comments/post_comments_1.json"] = J([{"string_map_data": {"Comment": {"value": random.choice(["Çok güzel olmuş 😍", "Harika!", "Süpersin 🔥"])}, "Media Owner": {"value": random.choice(users)}, "Time": {"timestamp": NOW - random.randint(1, 900) * DAY}}} for _ in range(80)])
part1["your_instagram_activity/saved/saved_posts.json"] = J({"saved_saved_media": [{"title": random.choice(users), "string_map_data": {"Saved on": {"href": f"https://www.instagram.com/p/S{i}/", "timestamp": NOW - i * 3 * DAY}}} for i in range(50)]})
part1["your_instagram_activity/story_interactions/polls.json"] = J({"story_activities_polls": [{"title": random.choice(users), "string_list_data": [{"value": "Evet", "timestamp": NOW - i * 9 * DAY}]} for i in range(12)]})

# Aramalar, güvenlik, reklamlar
part1["logged_information/recent_searches/account_searches.json"] = J({"searches_user": [{"title": "", "media_map_data": {}, "string_map_data": {"Search": {"href": "", "value": random.choice(users), "timestamp": 0}, "Time": {"href": "", "value": "", "timestamp": NOW - i * 2 * DAY}}} for i in range(70)]})
part1["logged_information/link_history/link_history.json"] = J([{"label_values": [{"label": "Website link", "value": "https://haber.example.com/makale/" + str(i)}, {"label": "Website name", "value": "Haber Sitesi"}, {"timestamp_value": NOW - i * DAY, "label": "Start time"}]} for i in range(25)])
part1["security_and_login_information/login_and_profile_creation/login_activity.json"] = J({"account_history_login_history": [{"title": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(NOW - i * 5 * DAY)), "string_map_data": {"IP Address": {"value": f"88.230.{i}.{i * 3 % 255}"}, "Language Code": {"value": "tr"}, "Time": {"timestamp": NOW - i * 5 * DAY}, "User Agent": {"value": "Instagram 300.0 Android (34/14; Samsung SM-A546E)"}}} for i in range(40)]})
part1["security_and_login_information/login_and_profile_creation/password_change_activity.json"] = J({"account_history_password_change_history": [{"title": "", "string_map_data": {"Time": {"timestamp": NOW - 400 * DAY}}}]})
part1["ads_information/instagram_ads_and_businesses/advertisers_using_your_activity_or_information.json"] = J({"ig_custom_audiences_all_types": [{"advertiser_name": n, "has_data_file_custom_audience": random.random() < 0.5, "has_remarketing_custom_audience": True, "has_in_person_store_visit": False} for n in ["Trendyol", "Getir", "Spotify", "Netflix", "Hepsiburada", "Yemeksepeti"]]})
part1["ads_information/ads_and_topics/ads_viewed.json"] = J({"impressions_history_ads_seen": [{"string_map_data": {"Author": {"value": random.choice(["marka_a", "marka_b"])}, "Time": {"timestamp": NOW - i * DAY}}} for i in range(60)]})
part1["preferences/your_topics/your_topics.json"] = J({"topics_your_topics": [{"string_map_data": {"Name": {"value": t}}} for t in ["Futbol", "Kahve", "Seyahat", "Fotoğrafçılık", "Teknoloji", "Müzik"]]})
part1["personal_information/information_about_you/profile_based_in.json"] = J({"inferred_data_primary_location": [{"string_map_data": {"City Name": {"value": "İstanbul"}}}]})

with zipfile.ZipFile("arsiv-part1.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for k, v in part1.items():
        z.writestr(PRE + k, v)
with zipfile.ZipFile("arsiv-part2.zip", "w", zipfile.ZIP_STORED) as z:
    for k, v in part2.items():
        z.writestr(PRE + k, v)
print("arsiv-part1.zip:", len(part1), "dosya · arsiv-part2.zip:", len(part2), "dosya")
