# Editing the Warka Furniture site

The whole site is `index.html`. One file, no build step, no server needed.
Open it in a browser to view it; open it in a text editor to change it.

Everything below lives in the last `<script>` block, near the bottom of the
file. Search for the heading in **bold** to find it.

---

## 0. Opening it

`index.html` **is** the website. It is not a document — it is a web page, so it
has to be opened by a browser.

- **Windows**: right-click the file → *Open with* → Chrome or Edge.
  To make that permanent: *Open with* → *Choose another app* → Chrome →
  tick *Always use this app*.
- **Mac**: right-click → *Open With* → Safari or Chrome.
- **Phone**: send it to yourself and open it from the Files app, or just use
  the hosted link.

If it opens in Notepad, TextEdit or a code editor and you see the source code,
the file is fine — the computer just handed it to the wrong program.

There is also a **Download this site** button at the bottom of the page itself.
It rebuilds the whole site into one fresh `warka-furniture.html` you can keep,
copy to a USB stick, or give to whoever puts it online.

---

## 1. Phone number and email  — **`0. SHOP DETAILS`**

```js
var CONTACT = {
  phone:     '+251 00 000 0000',
  phoneHref: '+251000000000',
  mail:      'warka@example.com'
};
```

Three lines. `phone` is what people read, `phoneHref` is what their phone
dials (digits and a leading `+` only, no spaces), `mail` is where an order
is sent. **These are placeholders — replace them before the site goes out.**

---

## 2. Prices  — **`6. THE CATALOGUE`**, the `PRICES` block

```js
var PRICES = {
  'bed-180-cm-cream-plain-base':     30000,
  'bed-180-cm-grey-storage-base':    18000,
  'dress-100-cm-white-with-mirror':  'Br 15,000 – 16,500'
};
```

Anything not listed here shows **"Ask in the shop"**. To price a piece, add a
line with its reference. Every piece shows its own reference at the bottom of
its page, under **Reference** — copy it from there.

- A plain number (`30000`) is formatted as `Br 30,000` and counts towards the
  order total.
- A string (`'Br 15,000 – 16,500'`) is printed exactly as written and is left
  out of the total, which is right for a range.

---

## 3. Photographs  — the `PHOTOS` block, just underneath

```js
var PHOTOS = {
  'chest-5-drawer-marble-80-cm': IMG.chest,
  ...
};
```

A piece with a photograph shows it and is tagged **Photographed**; everything
else draws itself in 3D. To add a photograph, put the picture in the `IMG`
object above as a data URI and point a reference at it.

To turn a `.jpg` into a data URI, run this next to the picture:

```sh
python3 -c "import base64,sys;print('data:image/jpeg;base64,'+base64.b64encode(open(sys.argv[1],'rb').read()).decode())" photo.jpg
```

Keep photographs around 420 px wide and saved at quality 78 or so, or the file
gets heavy.

---

## 4. What is in the catalogue  — the `LINES` block

Each entry is one product line. This one makes 20 pieces — five sizes, two
colours, two bases:

```js
{ key:'bed', cat:'beds', name:'Buttoned bed', build:'bed', rank:1,
  axes:[ ['size',  ['90 cm','120 cm','140 cm','160 cm','180 cm']],
         ['colour',['cream','grey']],
         ['base',  ['plain base','storage base']] ],
  derive:function(v){ ... } }
```

- **Adding a size or a colour**: add it to the right `axes` list. The pieces
  appear immediately and the count on the home page follows.
- **`rank`** orders the lines under *Sort: featured* — lower comes first.
- **`cat`** must match a `key` in `CATEGORIES` above.
- **`derive`** turns the chosen options into the drawing. `build` picks the
  model (`bed`, `dresser`, `chest`, `pedestal`, `stool`), `part` draws just one
  part of it, and `opts` sets its dimensions.

Adding a **new kind of furniture** needs a new model in `4. THE PIECES`, which
is more than a text edit — ask for it.

---

## 5. Words on the page

Plain HTML, above the scripts. Search for the sentence you want to change.
The four columns are under `id="workshop"`, the shop address is under
`id="visit"`.

---

## 6. Putting it online

Upload `index.html` to any host — Netlify, GitHub Pages, cPanel, anything. It
needs nothing else: the 3D library, the fonts and the photographs are all
inside the file.

For GitHub Pages: repository **Settings → Pages → Deploy from a branch**, pick
the branch, and the site is at `https://<user>.github.io/<repo>/`.

---

## What the site does not do

There is no server, so nothing is charged and no order is stored anywhere but
the customer's own browser. **Send the order by email** opens their mail app
with the list filled in; **Copy the order** puts it on the clipboard for
Telegram or a message. Orders reach you the way they do now — by mail, by
Telegram, or by phone.
