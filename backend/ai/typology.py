"""Jungian-inspired preference indicator (original items; not a validated test).

Four forced-choice axes — attitude (E/I), perceiving (S/N), judging (T/F) and
which world the person shows first (J/P) — are scored into a four-letter code
and a function stack (dominant, auxiliary, tertiary, inferior) using the
standard Jung/Myers rule. It is a reflection aid, never a diagnosis.
"""
from __future__ import annotations

from typing import Any

# (axis, text, option_a_pole, option_a_text, option_b_pole, option_b_text)
ITEMS: list[tuple[str, str, str, str, str, str]] = [
    ("EI", "بعد از یک روز شلوغ، بیشتر…", "E", "با دیدن آدم‌ها و گفت‌وگو انرژی می‌گیرم", "I", "با خلوت و فکر کردن انرژی می‌گیرم"),
    ("EI", "وقتی ایده‌ای دارم…", "E", "با گفتنش به دیگران روشن‌ترش می‌کنم", "I", "اول در ذهن خودم می‌پرورانمش"),
    ("EI", "در جمع تازه…", "E", "زود وارد گفت‌وگو می‌شوم", "I", "اول مشاهده می‌کنم و بعد وارد می‌شوم"),
    ("EI", "دوست دارم زندگی‌ام…", "E", "پر از رویداد و تعامل باشد", "I", "چند رابطه و فعالیت عمیق داشته باشد"),
    ("SN", "هنگام یادگیری چیز تازه…", "S", "مثال‌ها و جزئیات عملی را ترجیح می‌دهم", "N", "تصویر کلی و ایدهٔ پشت آن را ترجیح می‌دهم"),
    ("SN", "بیشتر به چه اعتماد می‌کنم؟", "S", "تجربهٔ واقعی و آنچه دیده‌ام", "N", "حس درونی و الگوهایی که می‌بینم"),
    ("SN", "در گفت‌وگو…", "S", "از واقعیت‌ها و رویدادهای مشخص حرف می‌زنم", "N", "از امکان‌ها و معناها حرف می‌زنم"),
    ("SN", "کار ایده‌آلم…", "S", "نتیجهٔ ملموس و قابل‌دیدن دارد", "N", "امکان نوآوری و فکر کردن به آینده دارد"),
    ("TF", "در تصمیم‌های سخت…", "T", "منطق و معیارهای روشن را مقدم می‌دارم", "F", "ارزش‌ها و تأثیر بر آدم‌ها را مقدم می‌دارم"),
    ("TF", "در اختلاف با دیگران…", "T", "دنبال درست‌بودن و انصاف عینی هستم", "F", "دنبال حفظ رابطه و تفاهم هستم"),
    ("TF", "نقد دیگران را…", "T", "بیشتر به‌عنوان اطلاعات مفید می‌گیرم", "F", "بیشتر روی احساسم اثر می‌گذارد"),
    ("TF", "تحسین‌برانگیزتر است…", "T", "تفکر دقیق و بی‌طرف", "F", "همدلی و دلسوزی"),
    ("JP", "برنامهٔ هفته‌ام…", "J", "از قبل مشخص است و پایبندم", "P", "باز می‌گذارم تا ببینم چه پیش می‌آید"),
    ("JP", "کارها را…", "J", "زودتر تمام می‌کنم تا آسوده شوم", "P", "تا آخرین لحظه باز نگه می‌دارم تا گزینه‌ها بمانند"),
    ("JP", "تصمیم گرفتن…", "J", "آرامم می‌کند", "P", "حس محدود شدن می‌دهد"),
    ("JP", "محیط کارم…", "J", "منظم و مرتب است", "P", "منعطف و گاهی شلوغ است"),
]

FUNCTION_FA = {"Ti": "تفکر درونی", "Te": "تفکر برونی", "Fi": "احساس درونی", "Fe": "احساس برونی",
               "Si": "حس درونی", "Se": "حس برونی", "Ni": "شهود درونی", "Ne": "شهود برونی"}


def questions() -> list[dict[str, Any]]:
    return [{"id": i, "axis": ax, "text": t, "a": {"pole": ap, "text": at}, "b": {"pole": bp, "text": bt}}
            for i, (ax, t, ap, at, bp, bt) in enumerate(ITEMS)]


def _stack(code: str) -> list[str]:
    e_i, s_n, t_f, j_p = code
    perceive, judge = ("S" if s_n == "S" else "N"), ("T" if t_f == "T" else "F")
    # J/P describes the function shown in the OUTER world
    outer_is_judging = j_p == "J"
    ext = e_i == "E"
    # dominant: extravert -> outer function; introvert -> the other one
    dom_is_judging = outer_is_judging if ext else not outer_is_judging
    dom_letter, aux_letter = (judge, perceive) if dom_is_judging else (perceive, judge)
    dom_att = "e" if ext else "i"
    aux_att = "i" if ext else "e"
    opp = {"T": "F", "F": "T", "S": "N", "N": "S"}
    att = lambda a: "i" if a == "e" else "e"  # noqa: E731
    return [dom_letter + dom_att, aux_letter + aux_att, opp[aux_letter] + att(aux_att),
            opp[dom_letter] + att(dom_att)]


def score(answers: dict[int, str]) -> dict[str, Any]:
    """``answers``: item index -> 'a' | 'b'. Missing items are ignored."""
    tally: dict[str, int] = {}
    asked: dict[str, int] = {}
    for i, choice in answers.items():
        if not (0 <= i < len(ITEMS)) or choice not in ("a", "b"):
            raise ValueError("invalid answer")
        axis, _t, ap, _at, bp, _bt = ITEMS[i]
        pole = ap if choice == "a" else bp
        tally[pole] = tally.get(pole, 0) + 1
        asked[axis] = asked.get(axis, 0) + 1
    if len(answers) < 8:
        raise ValueError("at least 8 answers are required")
    code, margins = "", {}
    for axis, (p1, p2) in {"EI": ("E", "I"), "SN": ("S", "N"), "TF": ("T", "F"), "JP": ("J", "P")}.items():
        n1, n2 = tally.get(p1, 0), tally.get(p2, 0)
        # ties resolve to the second pole (I/N/F/P) — flagged as 'balanced'
        chosen = p1 if n1 > n2 else p2
        code += chosen
        margins[axis] = {"pole": chosen, "score": {p1: n1, p2: n2}, "balanced": n1 == n2}
    stack = _stack(code)
    return {
        "code": code, "axes": margins, "function_stack": stack,
        "function_stack_fa": [FUNCTION_FA[f] for f in stack],
        "dominant": stack[0], "inferior": stack[3],
        "note_fa": ("این پرسشنامهٔ کوتاه و غیراستاندارد فقط ترجیح‌های احتمالی را نشان می‌دهد؛ تیپ‌ها پیوستارند، "
                    "نه دسته‌های ثابت. نتیجه را با تجربهٔ خودتان بسنجید."),
    }
