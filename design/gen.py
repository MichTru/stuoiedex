"""Genera gli artboard .dc.html di Stuoiedex con sprite in pixel art."""
import json, os, random
from datetime import datetime, timezone

ROOT = os.path.join(os.path.dirname(__file__), "project")
os.makedirs(ROOT, exist_ok=True)

# ---------------- palette ----------------
INK = "#14183A"      # contorni e testo
BLU = "#1B2F6E"      # blu Stuoie
BLU_D = "#101D4A"
ROSSO = "#C8102E"    # rosso gallo
ROSSO_D = "#8E0B21"
CARTA = "#F3F5FA"    # finestre
ORO = "#F2B200"
ARGENTO = "#AEB8C9"
GRIGIO = "#5A6178"   # testo secondario (contrasto ok su CARTA)

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&amp;family=Pixelify+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet">')

# ---------------- sprite ----------------
BASE = [
    "................",
    "....kkkkkkkk....",
    "...khhhhhhhhk...",
    "..khhhhhhhhhhk..",
    "..khsssssssshk..",
    "..kssessssessk..",
    "..kssssssssssk..",
    "..kssssbbsssk...",
    "...kssssssssk...",
    "....kkkkkkkk....",
    "..kcccccccccck..",
    ".kcccccccccccck.",
    ".ksccccccccccsk.",
    ".ksccccccccccsk.",
    "..kddddddddddk..",
    "..kkkk....kkkk..",
]
BASE[7] = "..ksssskkssssk.."

ACC = {
    "berretto": {0: "....kkkkkkkk....", 1: "...kaaaaaaaak...", 2: "..kaaaaaaaaaak..",
                 3: "..kaaaaaaaaaaaak"},
    "occhiali": {5: "..ksxxxkkxxxsk.."},
    "sciarpa": {9: "....rrrrrrrr....", 10: "..krrrrrrrrrrk..", 11: ".kcccccrrccccck."},
    "corona": {0: "...gg.gg.gg.gg..", 1: "...gggggggggg..."},
    "coppola": {1: "...kaaaaaaaak...", 2: "..kaaaaaaaaaak..", 3: "..kkkkkkkkkkkkk."},
    "calvo": {1: "....kkkkkkkk....", 2: "...ksssssssk....", 3: "..khsssssssshk.."},
    "baffi": {7: "..kssbbbbbbssk.."},
    "lunghi": {6: "..khsssssssshk..", 7: "..khsskksssshk..", 8: "..khssssssshk...", 9: "..hhkkkkkkkkhh.."},
}
ACC["calvo"][2] = "...kssssssssk..."


def sprite(skin, hair, shirt, shade, acc=(), a="#C8102E", r="#C8102E", g="#F2B200", sil=False):
    rows = list(BASE)
    for name in acc:
        for i, s in ACC[name].items():
            rows[i] = "".join(n if n != "." else o for n, o in zip(s, rows[i])) if name not in ("calvo", "lunghi", "coppola", "baffi") else s
    pal = {"k": INK, "s": skin, "h": hair, "e": INK, "b": INK, "c": shirt, "d": shade,
           "a": a, "x": "#2B2F45", "r": r, "g": g}
    out = []
    for y, row in enumerate(rows):
        x = 0
        while x < 16:
            ch = row[x]
            if ch == ".":
                x += 1
                continue
            n = 1
            while x + n < 16 and row[x + n] == ch:
                n += 1
            col = INK if sil else pal[ch]
            out.append(f'<rect x="{x}" y="{y}" width="{n}" height="1" fill="{col}"></rect>')
            x += n
    return "".join(out)


def svg(body, size, label):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 16 16" shape-rendering="crispEdges" '
            f'role="img" aria-label="{label}" style="display: block">{body}</svg>')


# Clienti inventati per i mockup
P = {
    "zvani":  dict(nick="Zvanì", lv=30, rar="leggendario", types=["Carte", "Saggio"],
                   spr=dict(skin="#E9B48A", hair="#D9D9D9", shirt="#1B2F6E", shade="#101D4A", acc=("calvo", "baffi", "corona"))),
    "bacco":  dict(nick="Bacco", lv=22, rar="raro", types=["Bianchino"],
                   spr=dict(skin="#D99873", hair="#3B2416", shirt="#7A1F3D", shade="#4E1327", acc=("coppola",), a="#5A4632")),
    "mery":   dict(nick="La Mery", lv=15, rar="non_comune", types=["Chiacchiera", "Spritz"],
                   spr=dict(skin="#F1C6A3", hair="#B8452B", shirt="#F2712B", shade="#B44F17", acc=("lunghi", "occhiali"))),
    "biondo": dict(nick="Il Biondo", lv=12, rar="non_comune", types=["Spritz"],
                   spr=dict(skin="#F1C6A3", hair="#E8C14A", shirt="#2E8B57", shade="#1E5E3B", acc=("occhiali",))),
    "prof":   dict(nick="Il Prof", lv=18, rar="non_comune", types=["Saggio"],
                   spr=dict(skin="#E2A87F", hair="#6B6B6B", shirt="#5A6178", shade="#3D4256", acc=("occhiali", "baffi"))),
    "gnola":  dict(nick="Gnola", lv=9, rar="comune", types=["Nottambulo"],
                   spr=dict(skin="#C68863", hair="#141414", shirt="#3B3F8F", shade="#262A66", acc=("sciarpa",), r="#C8102E")),
    "tonino": dict(nick="Tonino", lv=7, rar="comune", types=["Caffè"],
                   spr=dict(skin="#E9B48A", hair="#4A2E1C", shirt="#7A4A2A", shade="#52311B", acc=("berretto",), a="#C8102E")),
    "pippo":  dict(nick="Pippo", lv=4, rar="comune", types=["Calcio"],
                   spr=dict(skin="#F1C6A3", hair="#8A5A2B", shirt="#C8102E", shade="#8E0B21", acc=())),
    "michi":  dict(nick="Michi", lv=11, rar="non_comune", types=["Calcio", "Birra"],
                   spr=dict(skin="#EDBB93", hair="#2A1A10", shirt="#1B2F6E", shade="#101D4A", acc=("sciarpa",))),
}
TYPE_COL = {"Spritz": "#F2712B", "Caffè": "#7A4A2A", "Calcio": "#2E8B57", "Carte": "#C8102E",
            "Chiacchiera": "#B8860B", "Nottambulo": "#3B3F8F", "Mattiniero": "#C99A06", "Birra": "#A86F0C",
            "Bianchino": "#6E7F3A", "Saggio": "#5A6178"}
RAR = {"comune": ("Comune", INK), "non_comune": ("Non comune", "#7C889E"),
       "raro": ("Raro", ORO), "leggendario": ("Leggendario", ORO)}


def spr(key, size, sil=False):
    p = P[key]
    return svg(sprite(**p["spr"], sil=sil), size, "Sagoma sconosciuta" if sil else f"Sprite di {p['nick']}")


# ---------------- pezzi comuni ----------------
def crest(size=28):
    # stemma rossoblù con gallo stilizzato, in pixel
    rows = [
        "kkkkkkkkkkkk",
        "krrrrrbbbbbk",
        "krrwwrbbbbbk",
        "krwwwwwbbbbk",
        "krrwwwwwbbbk",
        "krrrwwwwwbbk",
        "krrrrwwywbbk",
        "krrrrrbybbbk",
        ".krrrrbbbbk.",
        "..krrrbbbk..",
        "...krrbbk...",
        "....kkkk....",
    ]
    pal = {"k": INK, "r": ROSSO, "b": BLU, "w": "#FFFFFF", "y": ORO}
    out = []
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                out.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{pal[ch]}"></rect>')
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true" '
            f'style="display: block; flex-shrink: 0">{"".join(out)}</svg>')


def pix_icon(rows, color, size=24):
    out = []
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == "#":
                out.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{color}"></rect>')
    n = len(rows)
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {n} {n}" shape-rendering="crispEdges" aria-hidden="true" '
            f'style="display: block">{"".join(out)}</svg>')


ICONS = {
    "dex": ["########", "#..##..#", "#..##..#", "########", "########", "#..##..#", "#..##..#", "########"],
    "feed": ["########", "#......#", "#.####.#", "#......#", "#.###..#", "#......#", "########", "........"],
    "sfide": ["##....##", "########", ".######.", ".######.", "..####..", "...##...", "..####..", ".######."],
    "io": ["..####..", ".######.", ".######.", "..####..", "........", ".######.", "########", "########"],
    "scan": ["###..###", "#......#", "#.####.#", "..#..#..", "..#..#..", "#.####.#", "#......#", "###..###"],
}


def nav(active):
    items = [("dex", "Stuoiedex"), ("feed", "Bacheca"), ("scan", "Scanner"), ("sfide", "Sfide"), ("io", "Io")]
    cells = []
    for key, label in items:
        if key == "scan":
            cells.append(
                f'<a href="Cattura.dc.html" aria-label="Scanner" style="width: 68px; height: 68px; margin-top: -26px; '
                f'background: {ROSSO}; border: 4px solid {INK}; box-shadow: 0 4px 0 {INK}; display: flex; align-items: center; '
                f'justify-content: center; text-decoration: none">{pix_icon(ICONS["scan"], "#FFFFFF", 30)}</a>')
            continue
        on = key == active
        col = "#FFFFFF" if on else "#9FB0DA"
        href = {"dex": "Main.dc.html", "feed": "Bacheca.dc.html", "sfide": "Sfide.dc.html", "io": "Scheda.dc.html"}[key]
        cells.append(
            f'<a href="{href}" style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 64px; '
            f'text-decoration: none; color: {col}; font-family: \'Pixelify Sans\', sans-serif; font-size: 13px; font-weight: 600">'
            f'{pix_icon(ICONS[key], col, 22)}<span>{label}</span>'
            + (f'<span style="width: 22px; height: 3px; background: {ORO}"></span>' if on else '<span style="width: 22px; height: 3px"></span>')
            + '</a>')
    return (f'<nav style="height: 92px; flex-shrink: 0; background: {BLU_D}; border-top: 4px solid {INK}; display: flex; '
            f'align-items: center; justify-content: space-around; padding: 0 8px 10px">{"".join(cells)}</nav>')


def window(inner, extra=""):
    # finestra retrò: bordo doppio
    return (f'<div style="background: {CARTA}; border: 4px solid {INK}; box-shadow: inset 0 0 0 3px {CARTA}, inset 0 0 0 5px {INK}, 0 4px 0 {INK}; '
            f'padding: 16px 18px; {extra}">{inner}</div>')


def type_chip(t, small=False):
    fs = 12 if small else 14
    pad = "3px 8px" if small else "5px 10px"
    return (f'<span style="background: {TYPE_COL[t]}; color: #FFFFFF; font-family: \'Pixelify Sans\', sans-serif; font-weight: 700; '
            f'font-size: {fs}px; padding: {pad}; border: 2px solid {INK}">{t}</span>')


def bar(frac, color, h=12, segs=20):
    on = round(frac * segs)
    cells = "".join(f'<span style="flex: 1; background: {color if i < on else "#D5DBE8"}"></span>' for i in range(segs))
    return f'<div style="display: flex; gap: 2px; height: {h}px; border: 3px solid {INK}; padding: 2px; background: #FFFFFF">{cells}</div>'


HELMET_BASE = f"""
body{{margin:0}}
a{{color:{BLU}}}a:hover{{color:{ROSSO}}}
@keyframes luccica{{0%{{border-color:{ORO}}}50%{{border-color:#FFF3B0}}100%{{border-color:{ORO}}}}}
@keyframes sali{{0%{{transform:translateY(0)}}50%{{transform:translateY(-6px)}}100%{{transform:translateY(0)}}}}
@keyframes scuoti{{0%,100%{{transform:rotate(0)}}25%{{transform:rotate(-14deg)}}75%{{transform:rotate(14deg)}}}}
@keyframes conta{{from{{width:100%}}to{{width:0%}}}}
.leggenda{{animation:luccica 1.6s steps(4) infinite}}
.saltella{{animation:sali 1.2s steps(3) infinite}}
.dondola{{animation:scuoti 0.9s steps(4) 3}}
.timer{{animation:conta 120s linear infinite}}
@media (prefers-reduced-motion: reduce){{.leggenda,.saltella,.dondola,.timer{{animation:none}}}}
"""


def page(title, w, h, inner, extra_css=""):
    return f"""<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>{HELMET_BASE}{extra_css}</style>
</helmet>
{inner}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
"""


def phone(inner_main, active):
    return (f'<div style="width: 390px; height: 844px; box-sizing: border-box; background: {BLU}; display: flex; flex-direction: column; '
            f'overflow: hidden; font-family: \'Pixelify Sans\', sans-serif; color: {INK}; '
            f'background-image: linear-gradient(rgba(255,255,255,0.04) 2px, transparent 2px); background-size: 100% 6px">'
            f'{inner_main}{nav(active) if active else ""}</div>')


def header(title, right=""):
    return (f'<header style="flex-shrink: 0; background: {ROSSO}; border-bottom: 4px solid {INK}; padding: 18px 18px 16px; '
            f'display: flex; align-items: center; gap: 12px">{crest(30)}'
            f'<h1 style="margin: 0; flex: 1; font-family: \'Press Start 2P\', monospace; font-size: 17px; color: #FFFFFF; '
            f'text-shadow: 3px 3px 0 {INK}; line-height: 1.3">{title}</h1>{right}</header>')


# ---------------- 1. Stuoiedex ----------------
def board_dex():
    caught = ["zvani", "bacco", "mery", "biondo", "prof", "gnola", "tonino", "pippo"]
    cells = []
    order = ["zvani", "bacco", "x1", "mery", "prof", "biondo", "x2", "gnola", "tonino", "x3", "pippo", "x4"]
    for k in order:
        if k.startswith("x"):
            cells.append(
                f'<div style="background: #DCE2EE; border: 3px solid {INK}; padding: 10px 6px 8px; display: flex; flex-direction: column; '
                f'align-items: center; gap: 6px">{spr("tonino", 64, sil=True)}'
                f'<span style="font-family: \'Press Start 2P\', monospace; font-size: 10px; color: {GRIGIO}">???</span></div>')
            continue
        p = P[k]
        border = ORO if p["rar"] in ("raro", "leggendario") else (ARGENTO if p["rar"] == "non_comune" else INK)
        cls = ' class="leggenda"' if p["rar"] == "leggendario" else ""
        dot = "".join(f'<span style="width: 8px; height: 8px; background: {TYPE_COL[t]}; border: 1px solid {INK}"></span>' for t in p["types"])
        link = ' href="Scheda.dc.html"' if k == "zvani" else ' href="Scheda.dc.html"'
        cells.append(
            f'<a{link}{cls} style="background: {CARTA}; border: 3px solid {border}; outline: 2px solid {INK}; padding: 10px 6px 8px; display: flex; '
            f'flex-direction: column; align-items: center; gap: 6px; text-decoration: none; color: {INK}">{spr(k, 64)}'
            f'<span style="font-weight: 700; font-size: 15px; white-space: nowrap">{p["nick"]}</span>'
            f'<span style="display: flex; gap: 3px">{dot}</span></a>')
    chips = "".join(
        f'<button type="button" style="flex-shrink: 0; background: {"#FFFFFF" if i == 0 else BLU_D}; color: {INK if i == 0 else "#FFFFFF"}; '
        f'border: 3px solid {INK}; font-family: \'Pixelify Sans\', sans-serif; font-weight: 700; font-size: 15px; padding: 8px 12px; min-height: 44px">{t}</button>'
        for i, t in enumerate(["Tutti", "Spritz", "Carte", "Calcio", "Caffè", "Saggio"]))
    counter = (f'<span style="background: {INK}; color: {ORO}; font-family: \'Press Start 2P\', monospace; font-size: 11px; '
               f'padding: 8px 8px">8/12</span>')
    main = (header("Stuoiedex", counter)
            + f'<div style="display: flex; gap: 8px; padding: 14px 16px 4px; overflow: hidden">{chips}</div>'
            + f'<main style="flex: 1; overflow: hidden; padding: 12px 16px 16px; display: grid; '
              f'grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-content: start">{"".join(cells)}</main>')
    return page("Stuoiedex", 390, 844, phone(main, "dex"))


# ---------------- 2. Scheda ----------------
def board_scheda():
    p = P["zvani"]
    badges = [("#C8102E", "Re del beccaccino"), (ORO, "Colonna del bar"), ("#2E8B57", "Tifoso"), (BLU, "Habitué"), ("#7A4A2A", "Di casa")]
    medal_rows = ["..####..", ".#....#.", "#..##..#", "#.####.#", "#.####.#", "#..##..#", ".#....#.", "..####.."]
    medals = "".join(f'<span title="{n}" style="background: #FFFFFF; border: 3px solid {INK}; padding: 6px">{pix_icon(medal_rows, c, 24)}</span>' for c, n in badges)
    stage = (f'<div style="position: relative; background: {BLU_D}; border: 4px solid {INK}; height: 236px; display: flex; '
             f'align-items: flex-end; justify-content: center; overflow: hidden; '
             f'background-image: linear-gradient(0deg, #0B1438 0 70px, transparent 70px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 8px, transparent 8px 16px)">'
             f'<div class="leggenda" style="border: 6px solid {ORO}; outline: 4px solid {INK}; background: #23397F; padding: 10px; margin-bottom: 18px">'
             f'<div class="saltella">{spr("zvani", 128)}</div></div>'
             f'<span style="position: absolute; top: 12px; left: 12px; background: {ORO}; color: {INK}; border: 3px solid {INK}; '
             f'font-family: \'Press Start 2P\', monospace; font-size: 10px; padding: 7px 8px">Leggendario</span>'
             f'<span style="position: absolute; top: 12px; right: 12px; color: #FFFFFF; font-family: \'Press Start 2P\', monospace; font-size: 12px; text-shadow: 2px 2px 0 {INK}">Lv 30</span></div>')
    name = (f'<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">'
            f'<h1 style="margin: 0; font-family: \'Press Start 2P\', monospace; font-size: 20px; color: #FFFFFF; text-shadow: 3px 3px 0 {INK}">{p["nick"]}</h1>'
            f'<span style="display: flex; gap: 6px">{"".join(type_chip(t) for t in p["types"])}</span></div>'
            f'<p style="margin: 0; color: {ORO}; font-weight: 700; font-size: 17px">Re del beccaccino</p>')
    desc = window(f'<p style="margin: 0; font-size: 18px; line-height: 1.45">Si dice che abbia battuto il parroco a beccaccino. Due volte, nella stessa sera.</p>')
    stats = window(
        f'<div style="display: flex; flex-direction: column; gap: 12px">'
        f'<div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700"><span>Esperienza</span><span>10.722</span></div>'
        f'{bar(1, ORO)}'
        f'<div style="display: flex; gap: 8px; flex-wrap: wrap">{medals}</div>'
        f'<div style="display: flex; justify-content: space-between; font-size: 16px; color: {GRIGIO}; font-weight: 600">'
        f'<span>Squadra I Galli</span><span>Al bar dal 2026</span></div></div>')
    actions = (f'<div style="display: flex; gap: 10px">'
               f'<button type="button" style="flex: 1; min-height: 52px; background: {ROSSO}; color: #FFFFFF; border: 4px solid {INK}; box-shadow: 0 4px 0 {INK}; '
               f'font-family: \'Press Start 2P\', monospace; font-size: 11px">Brindisi</button>'
               f'<button type="button" style="flex: 1; min-height: 52px; background: #FFFFFF; color: {INK}; border: 4px solid {INK}; box-shadow: 0 4px 0 {INK}; '
               f'font-family: \'Press Start 2P\', monospace; font-size: 11px">Amici</button></div>')
    main = (f'<main style="flex: 1; overflow: hidden; padding: 16px; display: flex; flex-direction: column; gap: 14px">'
            f'<a href="Main.dc.html" style="color: #FFFFFF; font-weight: 700; font-size: 16px; text-decoration: none">‹ Stuoiedex</a>'
            f'{stage}{name}{desc}{stats}{actions}</main>')
    return page("Scheda di Zvanì", 390, 844, phone(main, "dex"))


# ---------------- 3. Cattura ----------------
def board_cattura():
    cap_rows = [  # tappo a corona rossoblù
        "...########...",
        "..#r#b#r#b#r#.",
        ".#rrrbbbbrrrr#",
        "#rrrrbbbbrrrr#",
        "#rrrrbbbbrrrr#",
        "#rrrwwwwwwrrr#",
        "#bbbwkkkkwbbb#",
        "#bbbwkkkkwbbb#",
        "#rrrwwwwwwrrr#",
        "#rrrrbbbbrrrr#",
        "#rrrrbbbbrrrr#",
        ".#rrrbbbbrrr#.",
        "..#r#b#r#b#r..",
        "...########...",
    ]
    pal = {"#": INK, "r": ROSSO, "b": BLU, "w": "#FFFFFF", "k": INK}
    out = []
    for y, row in enumerate(cap_rows):
        for x, ch in enumerate(row):
            if ch != ".":
                out.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{pal[ch]}"></rect>')
    cap = (f'<svg width="112" height="112" viewBox="0 0 14 14" shape-rendering="crispEdges" role="img" aria-label="Tappo di cattura" '
           f'style="display: block">{"".join(out)}</svg>')
    star_rows = ["...#...", "...#...", ".#####.", "#######", ".#####.", "..#.#..", ".#...#."]
    stars = "".join(f'<span style="position: absolute; {pos}">{pix_icon(star_rows, ORO, 26)}</span>'
                    for pos in ["top: 60px; left: 70px", "top: 120px; right: 60px", "top: 250px; left: 40px", "top: 40px; right: 120px"])
    scene = (f'<div style="position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px">'
             f'{stars}'
             f'<div style="display: flex; align-items: flex-end; gap: 22px">'
             f'<div class="saltella" style="background: #23397F; border: 4px solid {INK}; padding: 12px">{spr("gnola", 150)}</div>'
             f'<div class="dondola" style="margin-bottom: -8px">{cap}</div></div>'
             f'<p style="margin: 0; font-family: \'Press Start 2P\', monospace; font-size: 12px; color: {ORO}; text-shadow: 2px 2px 0 {INK}">Nuovo nello Stuoiedex</p></div>')
    box = window(
        f'<div style="display: flex; flex-direction: column; gap: 14px">'
        f'<p style="margin: 0; font-family: \'Press Start 2P\', monospace; font-size: 14px; line-height: 1.7">Hai catturato GNOLA!</p>'
        f'<div style="display: flex; gap: 10px; font-weight: 700; font-size: 18px">'
        f'<span style="background: {BLU}; color: #FFFFFF; padding: 6px 10px; border: 2px solid {INK}">+30 XP</span>'
        f'<span style="background: {ORO}; color: {INK}; padding: 6px 10px; border: 2px solid {INK}">+3 gettoni</span>'
        f'<span style="background: #FFFFFF; color: {INK}; padding: 6px 10px; border: 2px solid {INK}">Amici</span></div>'
        f'<div style="display: flex; justify-content: flex-end"><a href="Main.dc.html" style="font-family: \'Press Start 2P\', monospace; font-size: 12px; '
        f'color: {INK}; text-decoration: none; min-height: 44px; display: flex; align-items: center">Continua ▼</a></div></div>')
    main = (f'<div style="flex: 1; display: flex; flex-direction: column; padding: 18px 16px 24px; '
            f'background-image: radial-gradient(circle at 50% 42%, #2C4699 0, {BLU_D} 62%)">{scene}{box}</div>')
    return page("Cattura", 390, 844, phone(main, None))


# ---------------- 4. Sfide ----------------
def board_sfide():
    tabs = "".join(
        f'<button type="button" style="flex: 1; min-height: 46px; background: {"#FFFFFF" if i == 0 else BLU_D}; color: {INK if i == 0 else "#FFFFFF"}; '
        f'border: 3px solid {INK}; font-family: \'Pixelify Sans\', sans-serif; font-weight: 700; font-size: 16px">{t}</button>'
        for i, t in enumerate(["Missioni", "Classifica", "Squadre"]))
    missions = [("Tre visite questa settimana", 2, 3, "+40 XP, 4 gettoni"),
                ("Cattura tre nuovi amici", 1, 3, "+60 XP, 6 gettoni"),
                ("Cinque serate partita", 4, 5, "Medaglia Tifoso")]
    ms = "".join(
        f'<div style="display: flex; flex-direction: column; gap: 8px; padding: 12px 0; border-bottom: 3px dashed #C5CCDB">'
        f'<div style="display: flex; justify-content: space-between; gap: 10px; font-weight: 700; font-size: 17px"><span>{t}</span><span>{a}/{b}</span></div>'
        f'{bar(a / b, ROSSO, 10, b * 4)}'
        f'<span style="font-size: 15px; color: {GRIGIO}; font-weight: 600">{r}</span></div>'
        for t, a, b, r in missions)
    m_win = window(f'<div style="display: flex; flex-direction: column">{ms}</div>', "padding-top: 4px")
    events = [("Ven", "20:45", "Serata partita", "calcio", "#2E8B57"), ("Sab", "21:00", "Torneo di beccaccino", "carte", ROSSO)]
    ev = "".join(
        f'<div style="display: flex; align-items: center; gap: 12px; background: {CARTA}; border: 3px solid {INK}; padding: 10px 12px">'
        f'<div style="background: {c}; color: #FFFFFF; border: 3px solid {INK}; width: 58px; text-align: center; padding: 6px 0">'
        f'<div style="font-family: \'Press Start 2P\', monospace; font-size: 10px">{d}</div><div style="font-weight: 700; font-size: 15px; margin-top: 4px">{h}</div></div>'
        f'<span style="flex: 1; font-weight: 700; font-size: 17px">{t}</span><span style="font-weight: 700; color: {GRIGIO}">+40 XP</span></div>'
        for d, h, t, k, c in events)
    podium_people = [("mery", 2, 410, 76, ARGENTO), ("bacco", 1, 465, 100, ORO), ("biondo", 3, 380, 60, "#C98A4B")]
    pod = "".join(
        f'<div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1">'
        f'{spr(k, 56)}<span style="color: #FFFFFF; font-weight: 700; font-size: 14px">{P[k]["nick"]}</span>'
        f'<div style="width: 100%; height: {h}px; background: {c}; border: 3px solid {INK}; display: flex; flex-direction: column; align-items: center; padding-top: 8px; gap: 4px">'
        f'<span style="font-family: \'Press Start 2P\', monospace; font-size: 16px; color: {INK}">{n}</span>'
        f'<span style="font-weight: 700; font-size: 14px; color: {INK}">{pts}</span></div></div>'
        for k, n, pts, h, c in podium_people)
    me = (f'<div style="display: flex; align-items: center; gap: 10px; background: {ORO}; border: 3px solid {INK}; padding: 8px 12px; font-weight: 700; font-size: 16px">'
          f'{spr("michi", 32)}<span style="flex: 1">Tu sei 5°</span><span>35 punti dal 4°</span></div>')
    main = (header("Sfide")
            + f'<main style="flex: 1; overflow: hidden; padding: 14px 16px; display: flex; flex-direction: column; gap: 14px">'
              f'<div style="display: flex; gap: 6px">{tabs}</div>{m_win}'
              f'<h2 style="margin: 2px 0 0; font-family: \'Press Start 2P\', monospace; font-size: 12px; color: #FFFFFF">Prossimi eventi</h2>{ev}'
              f'<h2 style="margin: 2px 0 0; font-family: \'Press Start 2P\', monospace; font-size: 12px; color: #FFFFFF">Novembre</h2>'
              f'<div style="display: flex; align-items: flex-end; gap: 8px">{pod}</div>{me}</main>')
    return page("Sfide", 390, 1100, phone(main, "sfide").replace("height: 844px", "height: 1100px"))


# ---------------- 5. Bacheca ----------------
def board_bacheca():
    pin = (f'<div style="background: {ORO}; border: 4px solid {INK}; box-shadow: 0 4px 0 {INK}; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px">'
           f'<div style="display: flex; align-items: center; gap: 10px">{crest(24)}<span style="font-family: \'Press Start 2P\', monospace; font-size: 11px">Bar Stuoie</span></div>'
           f'<p style="margin: 0; font-weight: 700; font-size: 19px">Sabato torneo di beccaccino</p>'
           f'<p style="margin: 0; font-size: 17px">Iscrizioni al bancone entro venerdì. In palio la corona.</p></div>')

    def post(k, text, when, n, tag=None):
        tg = f'<span style="background: {tag[1]}; color: {INK}; border: 2px solid {INK}; font-weight: 700; font-size: 13px; padding: 2px 6px">{tag[0]}</span>' if tag else ""
        return window(
            f'<div style="display: flex; gap: 12px">'
            f'<div style="background: #23397F; border: 3px solid {INK}; padding: 4px; align-self: flex-start">{spr(k, 56)}</div>'
            f'<div style="flex: 1; display: flex; flex-direction: column; gap: 6px">'
            f'<p style="margin: 0; font-size: 17px; line-height: 1.35"><strong>{P[k]["nick"]}</strong> {text}</p>'
            f'<div style="display: flex; align-items: center; gap: 8px">{tg}<span style="color: {GRIGIO}; font-size: 14px; font-weight: 600">{when}</span></div></div>'
            f'<button type="button" aria-label="Brindisi" style="align-self: center; min-width: 52px; min-height: 52px; background: #FFFFFF; border: 3px solid {INK}; '
            f'font-family: \'Press Start 2P\', monospace; font-size: 11px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px">'
            f'{pix_icon(["#....#..", "#....#..", ".#..#...", ".####...", "..##....", "..##....", "..##....", ".####..."], ROSSO, 18)}{n}</button></div>', "padding: 12px")

    posts = (post("bacco", "è diventato Raro", "2 ore fa", 14, ("Raro", ORO))
             + post("mery", "ha ottenuto la medaglia Collezionista", "ieri", 9)
             + post("tonino", "è salito al livello 7", "ieri", 5)
             + post("zvani", "e Il Prof vincono il torneo di briscola", "sabato", 31, ("Torneo", "#FFFFFF")))
    main = (header("Bacheca")
            + f'<main style="flex: 1; overflow: hidden; padding: 16px; display: flex; flex-direction: column; gap: 14px">{pin}{posts}</main>')
    return page("Bacheca", 390, 844, phone(main, "feed"))


# ---------------- 6. Bancone (tablet personale) ----------------
def fake_qr(n=29, seed=7):
    rnd = random.Random(seed)
    grid = [[rnd.random() < 0.46 for _ in range(n)] for _ in range(n)]

    def finder(ox, oy):
        for y in range(7):
            for x in range(7):
                edge = x in (0, 6) or y in (0, 6)
                core = 2 <= x <= 4 and 2 <= y <= 4
                grid[oy + y][ox + x] = edge or core
        for i in range(-1, 8):
            for (x, y) in [(ox + i, oy - 1), (ox + i, oy + 7), (ox - 1, oy + i), (ox + 7, oy + i)]:
                if 0 <= x < n and 0 <= y < n:
                    grid[y][x] = False
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7)
    rects = "".join(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{INK}"></rect>'
                    for y in range(n) for x in range(n) if grid[y][x])
    return (f'<svg width="400" height="400" viewBox="-2 -2 {n + 4} {n + 4}" shape-rendering="crispEdges" role="img" '
            f'aria-label="QR di check-in" style="display: block; background: #FFFFFF">{rects}</svg>')


def board_bancone():
    left = (f'<section style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; padding: 32px">'
            f'<div style="display: flex; align-items: center; gap: 14px">{crest(44)}'
            f'<h1 style="margin: 0; font-family: \'Press Start 2P\', monospace; font-size: 26px; color: #FFFFFF; text-shadow: 4px 4px 0 {INK}">Check-in</h1></div>'
            f'<div style="border: 6px solid {INK}; box-shadow: 0 6px 0 {INK}; padding: 14px; background: #FFFFFF">{fake_qr()}</div>'
            f'<div style="width: 428px; height: 14px; border: 4px solid {INK}; background: {BLU_D}">'
            f'<div class="timer" style="height: 100%; background: {ORO}"></div></div></section>')
    today = ["zvani", "bacco", "gnola", "tonino", "mery", "pippo"]
    faces = "".join(f'<div style="background: #23397F; border: 3px solid {INK}; padding: 3px">{spr(k, 44)}</div>' for k in today)
    btn = (f'<button type="button" style="min-height: 120px; background: {ORO}; color: {INK}; border: 5px solid {INK}; box-shadow: 0 6px 0 {INK}; '
           f'font-family: \'Press Start 2P\', monospace; font-size: 18px; line-height: 1.6">Convalida premio</button>')
    approve = (f'<a href="#" style="display: flex; align-items: center; justify-content: space-between; min-height: 72px; padding: 0 20px; background: {CARTA}; '
               f'border: 4px solid {INK}; color: {INK}; text-decoration: none; font-weight: 700; font-size: 22px">'
               f'<span>Schede da approvare</span><span style="background: {ROSSO}; color: #FFFFFF; border: 3px solid {INK}; '
               f'font-family: \'Press Start 2P\', monospace; font-size: 14px; padding: 8px 10px">2</span></a>')
    event = (f'<a href="#" style="display: flex; align-items: center; justify-content: space-between; min-height: 72px; padding: 0 20px; background: {CARTA}; '
             f'border: 4px solid {INK}; color: {INK}; text-decoration: none; font-weight: 700; font-size: 22px">'
             f'<span>Segna presenti: serata partita</span><span style="font-size: 26px">›</span></a>')
    right = (f'<section style="width: 460px; background: {BLU_D}; border-left: 6px solid {INK}; padding: 32px 28px; display: flex; flex-direction: column; gap: 20px">'
             f'{btn}{approve}{event}'
             f'<div style="margin-top: auto; display: flex; flex-direction: column; gap: 12px">'
             f'<h2 style="margin: 0; font-family: \'Press Start 2P\', monospace; font-size: 14px; color: #FFFFFF">Oggi al bar: 14</h2>'
             f'<div style="display: flex; gap: 8px; flex-wrap: wrap">{faces}</div></div></section>')
    root = (f'<div style="width: 1180px; height: 820px; display: flex; background: {BLU}; font-family: \'Pixelify Sans\', sans-serif; color: {INK}; '
            f'background-image: linear-gradient(rgba(255,255,255,0.04) 2px, transparent 2px); background-size: 100% 6px">{left}{right}</div>')
    return page("Bancone", 1180, 820, root)


boards = [
    ("Main.dc.html", "Stuoiedex", board_dex(), 390, 844),
    ("Scheda.dc.html", "Scheda leggendaria", board_scheda(), 390, 844),
    ("Cattura.dc.html", "Cattura", board_cattura(), 390, 844),
    ("Bacheca.dc.html", "Bacheca", board_bacheca(), 390, 844),
    ("Sfide.dc.html", "Sfide", board_sfide(), 390, 1100),
    ("Bancone.dc.html", "Bancone (tablet del personale)", board_bancone(), 1180, 820),
]

layout = {}
x = 0
for name, title, html, w, h in boards[:5]:
    layout[name] = {"x": x, "y": 0, "w": w, "h": h, "title": title}
    x += w + 80
layout["Bancone.dc.html"] = {"x": 0, "y": 1100 + 120 + 260, "w": 1180, "h": 820, "title": "Bancone (tablet del personale)"}
for b in ("Main.dc.html", "Scheda.dc.html", "Cattura.dc.html", "Bacheca.dc.html", "Sfide.dc.html"):
    layout[b]["is_interactive"] = True

canvas = {
    "v": 3,
    "createdOnFiles": {"v": 1, "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
    "title": "Stuoiedex — schermate",
    "launch": {"view": "canvas"},
    "pages": [],
    "boards": layout,
    "order": [b[0] for b in boards],
    "notes": {
        "t1": {"x": 0, "y": -300, "text": "App dei clienti", "kind": "title1", "maxW": x - 80},
        "t2": {"x": 0, "y": 1100 + 120 - 30, "text": "Pannello del personale", "kind": "title1", "maxW": 1180},
    },
    "designSystems": [],
}

for name, title, html, w, h in boards:
    with open(os.path.join(ROOT, name), "w") as f:
        f.write(html)
with open(os.path.join(ROOT, "canvas.json"), "w") as f:
    json.dump(canvas, f, ensure_ascii=False, indent=1)
print("ok", [b[0] for b in boards])
