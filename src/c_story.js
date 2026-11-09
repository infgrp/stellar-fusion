<script>
/* ═══════════════════════════════════════════════════════════════
   7. 반응 단계 대본
   각 단계: build(c) 로 배우를 세우고, update(c, t) 가 단계 안의 시각 t(초)에 맞춰 움직인다.
   c.once(key, fn) 는 한 번만 일어나는 사건 (융합 · 붕괴 · 소멸).
   ═══════════════════════════════════════════════════════════════ */
const H1 = nucHTML(1, 1, "H"), H2 = nucHTML(2, 1, "H"), He3 = nucHTML(3, 2, "He"), He4 = nucHTML(4, 2, "He");
const C12 = nucHTML(12, 6, "C"), N13 = nucHTML(13, 7, "N"), C13 = nucHTML(13, 6, "C"), N14 = nucHTML(14, 7, "N"), O15 = nucHTML(15, 8, "O"), N15 = nucHTML(15, 7, "N");
const AR = '<span class="arrow">→</span>';
const EP = "e⁺", NU = "ν<sub>e</sub>", GM = "γ";
const q = (mev) => ' <span class="q">+ ' + mev + " MeV</span>";

/* 두 입자가 다가오다 장벽에서 멈칫, 터널링 순간 붙는 거리 */
function approachGap(t, t1, start, wall) {
  if (t < t1) return lerp(start, wall, easeOut(t / t1));
  const u = t - t1;
  return wall + 0.45 * Math.abs(Math.sin(u * 6.5)) * Math.exp(-u * 0.6);
}
/* 양전자가 근처 전자를 만나 소멸 → 반대 방향 감마선 둘 */
function annihilation(c, key, from, t, t0, dirOut) {
  const meet = from.clone().addScaledVector(dirOut, 3.2);
  c.once(key + "e+", () => {
    c[key + "pos"] = new Lepton("e+", from);
    c[key + "ele"] = new Lepton("e-", meet.clone().add(new V3(3.5, 1.5, -1.5)));
  });
  const P = c[key + "pos"], E = c[key + "ele"];
  if (P && P.mesh.parent) {
    const k = seg(t, t0, t0 + 2.2);
    P.pos.copy(from).lerp(meet, easeOut(k));
    E.pos.copy(meet.clone().add(new V3(3.5, 1.5, -1.5))).lerp(meet, easeInOut(k));
    if (k >= 1) c.once(key + "ann", () => {
      P.dispose(); E.dispose();
      new Flash(meet, 0xbff8ff, 2.4, true);
      const d = randDir();
      new Gamma(meet, d, { label: true }); new Gamma(meet, d.clone().negate(), { label: false });
      c.caption("양전자 + 전자 → <b>감마선 2개</b> : 두 입자의 질량이 통째로 빛이 된다 (E = mc²)");
    });
  }
}

const PP = [
  {
    title: "① 양성자 + 양성자 → 중수소",
    eq: H1 + " + " + H1 + AR + H2 + " + " + EP + " + " + NU + q("1.44"),
    desc: "같은 + 전하끼리 밀어내는 <b>쿨롱 장벽</b>을 1570만 K 의 열운동만으로는 넘지 못한다. <b>양자 터널링</b>으로 아주 드물게 붙는 순간, " +
      "<b>약한 상호작용</b>이 양성자 하나를 중성자로 바꿔야 중수소가 된다. 태양의 양성자 하나가 이 반응을 겪기까지 평균 <b>약 100억 년</b> — 그래서 별은 천천히, 오래 탄다.",
    Q: 2 * 1.442, nu: 2 * 0.265, dur: 13, cam: [0, 5, 19],
    build(c) {
      c.sides = [-1, 1].map((sx, k) => {
        const site = new V3(5.2 * sx, 0, 0);
        const dir = new V3(0.45 * sx, 1, 0.35).normalize();
        return { sx, site, dir, delay: k * 0.6, a: new Nucleus(["p"], site), b: new Nucleus(["p"], site) };
      });
    },
    update(c, t) {
      for (const s of c.sides) {
        const u = t - s.delay, id = "s" + s.sx;
        if (!s.d) {
          const gap = approachGap(Math.max(0, u), 3.0, 12, 2.3);
          s.a.pos.copy(s.site).addScaledVector(s.dir, gap / 2);
          s.b.pos.copy(s.site).addScaledVector(s.dir, -gap / 2);
          if (u > 2.6) c.once(id + "bar", () => {
            s.bar = new Barrier(s.site, 1.5, s.sx < 0 ? "쿨롱 장벽" : "");
            if (s.sx < 0) c.caption("두 양성자가 서로 밀어낸다 — <b>쿨롱 장벽</b>. 고전적으로는 넘을 수 없는 벽");
          });
          if (u > 5.2) c.once(id + "fuse", () => {
            s.bar.pop();
            s.a.absorb(s.b);
            s.d = s.a;
            new Flash(s.site, 0xffb070, 3.2);
            if (s.sx < 0) c.caption("<b>양자 터널링</b>으로 장벽을 뚫고 붙었다! 그런데 양성자 둘만으로는 묶이지 않는다…");
          });
        } else {
          s.d.pos.copy(s.site);
          if (u > 6.2) c.once(id + "conv", () => {
            const w = s.d.convert();
            new Flash(w, 0x9fd0ff, 1.6, false);
            new Neutrino(w, s.dir.clone().add(new V3(0.3 * s.sx, 0.2, 0.8)).normalize());
            if (s.sx < 0) c.caption("<b>약한 상호작용</b>: 양성자 → 중성자 + e⁺ + νₑ. 이제 <b>중수소 ²H</b> — 중성미자는 별을 그대로 빠져나간다");
          });
          if (u > 6.3) annihilation(c, id, s.site.clone().add(new V3(0, 0.6, 0)), u, 6.4, new V3(0.8 * s.sx, 0.5, 0.6).normalize());
        }
      }
    },
  },
  {
    title: "② 중수소 + 양성자 → 헬륨-3",
    eq: H2 + " + " + H1 + AR + He3 + " + " + GM + q("5.49"),
    desc: "중수소는 곧바로 — 평균 <b>약 1초</b> 만에 — 양성자를 하나 더 붙잡는다. 핵력으로 단단히 묶이며 남는 에너지는 <b>감마선</b>으로 나온다. " +
      "①과 ②는 양쪽에서 한 번씩, 모두 두 번 일어나 ³He 두 개를 만든다.",
    Q: 2 * 5.493, nu: 0, dur: 8, cam: [0, 5, 19],
    build(c) {
      c.sides = [-1, 1].map((sx, k) => {
        const site = new V3(5.2 * sx, 0, 0);
        const dir = new V3(-0.3 * sx, -0.7, 0.65).normalize();
        return { sx, site, dir, delay: k * 0.45, d: new Nucleus(["p", "n"], site), p: new Nucleus(["p"], site) };
      });
    },
    update(c, t) {
      for (const s of c.sides) {
        const u = t - s.delay, id = "s" + s.sx;
        s.d.pos.copy(s.site);
        if (!s.he) {
          const gap = approachGap(Math.max(0, u), 2.4, 11, 2.2);
          s.p.pos.copy(s.site).addScaledVector(s.dir, gap);
          if (u > 2.0) c.once(id + "bar", () => { s.bar = new Barrier(s.site, 1.6, ""); });
          if (u > 3.4) c.once(id + "fuse", () => {
            s.bar.pop();
            s.d.absorb(s.p);
            s.he = s.d;
            new Flash(s.site, 0xffd27a, 3.4);
            new Gamma(s.site, s.dir.clone().negate().add(new V3(0, 0.6, 0)).normalize(), { label: true });
            if (s.sx < 0) c.caption("²H + p → <b>³He</b>. 남는 5.49 MeV 가 <b>감마선</b>으로 — 이 빛이 수십만 년 걸려 표면까지 간다");
          });
        }
      }
    },
  },
  {
    title: "③ 헬륨-3 + 헬륨-3 → 헬륨-4 + 양성자 2개",
    eq: He3 + " + " + He3 + AR + He4 + " + 2" + H1 + q("12.86"),
    desc: "③He 두 개가 만나면 <b>헬륨-4</b> 가 되고 양성자 두 개가 다시 풀려나 다음 반응의 재료가 된다. " +
      "전하가 2 씩이라 장벽이 더 높다. (태양에서는 이 <b>pp-I</b> 가지가 약 83%, 나머지는 ⁷Be 를 거치는 pp-II·III 가지)",
    Q: 12.859, nu: 0, dur: 10, cam: [0, 4, 16],
    build(c) {
      c.a = new Nucleus(["p", "p", "n"], new V3(-5.2, 0, 0));
      c.b = new Nucleus(["p", "p", "n"], new V3(5.2, 0, 0));
    },
    update(c, t) {
      if (!c.he) {
        const gap = approachGap(t, 3.4, 10.4, 3.2);
        c.a.pos.set(-gap / 2, 0, 0);
        c.b.pos.set(gap / 2, 0, 0);
        if (t > 3.0) c.once("bar", () => { c.bar = new Barrier(new V3(), 2.2, "쿨롱 장벽 (전하 2 × 2)"); });
        if (t > 5.0) c.once("fuse", () => {
          c.bar.pop();
          c.a.absorb(c.b);
          c.he = c.a;
          new Flash(new V3(), 0xffe0a0, 5.5);
          c.caption("두 ³He 가 하나로 — 그중 양성자 두 개는 곧 튕겨 나간다");
        });
      } else {
        c.he.pos.set(0, 0, 0);
        if (t > 5.8) c.once("eject", () => {
          c.p1 = c.he.split(1, 0); c.p2 = c.he.split(1, 0);
          c.v1 = new V3(-1, 0.55, 0.4).normalize(); c.v2 = new V3(1, -0.4, 0.5).normalize();
          c.p0 = [c.p1.pos.clone(), c.p2.pos.clone()];
          new Flash(new V3(), 0xffc46b, 4.5);
          c.caption("<b>⁴He</b> 탄생! 양성자 2개는 풀려나 다시 ①번 반응의 재료로");
        });
        if (c.p1) {
          const s = easeOut(seg(t, 5.8, 9.5)) * 9;
          c.p1.pos.copy(c.p0[0]).addScaledVector(c.v1, s);
          c.p2.pos.copy(c.p0[1]).addScaledVector(c.v2, s);
        }
        c.he.halo.material.opacity = 0.38 + 0.25 * Math.sin(t * 4);
      }
    },
  },
  {
    title: "합계 — 질량 결손이 에너지로",
    eq: "4" + H1 + AR + He4 + " + 2" + EP + " + 2" + NU + q("26.7"),
    desc: "수소 원자 4개 = 4 × 1.007825 u = <b>4.031300 u</b>, 헬륨 원자 1개 = <b>4.002603 u</b>. 사라진 0.028697 u (<b>0.71%</b>) 가 " +
      "E = Δm c² = <b>26.7 MeV</b> 가 된다. 태양은 매초 약 6억 톤의 수소를 헬륨으로 바꾸고, 그중 <b>약 400만 톤</b>이 빛이 된다.",
    Q: 0, nu: 0, dur: 11, cam: [0, 4, 18], summary: true,
    build(c) {
      c.ps = [0, 1, 2, 3].map((i) => new Nucleus(["p"], new V3(-7, 3.3 - i * 2.2, 0)));
      c.caption("수소 4개의 질량 <b>4.031300 u</b>");
    },
    update(c, t) {
      if (!c.he) {
        const k = easeInOut(seg(t, 1.2, 3.6));
        c.ps.forEach((p, i) => p.pos.set(-7, 3.3 - i * 2.2, 0).lerp(new V3(0, 0, 0), k));
        if (t > 3.6) c.once("fuse", () => {
          c.he = c.ps[0];
          for (let i = 1; i < 4; i++) c.he.absorb(c.ps[i]);
          c.he.convert(); c.he.convert();
          new Flash(new V3(), 0xfff0c0, 8);
          for (let i = 0; i < 10; i++) new Gamma(new V3(), randDir(), { speed: 10, len: 4, label: i === 0 });
          new Neutrino(new V3(), randDir()); new Neutrino(new V3(), randDir());
          c.caption("헬륨 1개 <b>4.002603 u</b> — 사라진 질량 <b>0.71%</b> 가 26.7 MeV 의 에너지로");
        });
      } else {
        c.he.pos.set(0, 0, 0);
        c.he.halo.material.opacity = 0.45 + 0.25 * Math.sin(t * 3);
        if (t > 7.5) c.once("tail", () => c.caption("이 과정이 태양 중심에서 <b>매초 약 10³⁸ 번</b> 일어난다"));
      }
    },
  },
];

/* ── CNO 순환: 고리 위 여섯 정거장 ── */
const RING_R = 6.4;
const CNO_NUC = [[6, 6], [7, 6], [6, 7], [7, 7], [8, 7], [7, 8]]; // [Z, N]
const stationAngle = (k) => (k * Math.PI) / 3;
const stationPos = (k) => new V3(RING_R * Math.sin(stationAngle(k)), 0, -RING_R * Math.cos(stationAngle(k)));
const typesOf = ([Z, N]) => { const a = []; for (let i = 0; i < Math.max(Z, N); i++) { if (i < Z) a.push("p"); if (i < N) a.push("n"); } return a; };
function arcPos(k, f) { // 정거장 k 에서 k+1 로, 고리를 따라
  const a = stationAngle(k) + f * (Math.PI / 3);
  return new V3(RING_R * Math.sin(a), Math.sin(f * Math.PI) * 0.6, -RING_R * Math.cos(a));
}

const ringGroup = new THREE.Group();
ringGroup.visible = false;
coreGroup.add(ringGroup);
const stationLabels = [];
{
  const torus = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.05, 12, 220), new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.55, toneMapped: false }));
  torus.rotation.x = Math.PI / 2;
  ringGroup.add(torus);
  // 진행 방향 표시
  for (let k = 0; k < 6; k++) for (const f of [0.35, 0.65]) {
    const p = arcPos(k, f).setY(0), p2 = arcPos(k, f + 0.02).setY(0);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 16), new THREE.MeshBasicMaterial({ color: 0xffd090, toneMapped: false }));
    cone.position.copy(p);
    cone.lookAt(p2);
    cone.rotateX(Math.PI / 2);
    ringGroup.add(cone);
  }
  const kinds = ["(p, γ)", "β⁺", "(p, γ)", "(p, γ)", "β⁺", "(p, α)"];
  for (let k = 0; k < 6; k++) {
    const [Z, N] = CNO_NUC[k];
    const disc = glowSprite(0xffa050, 1.6, 0.6);
    disc.position.copy(stationPos(k));
    ringGroup.add(disc);
    const out = stationPos(k).normalize();
    const l = cssLabel(nucHTML(Z + N, Z, SYM[Z]), "station");
    l.position.copy(stationPos(k)).addScaledVector(out, 2.3).setY(-0.9);
    ringGroup.add(l);
    stationLabels.push(l);
    const kl = cssLabel(kinds[k], "kind");
    kl.position.copy(arcPos(k, 0.5).setY(0)).multiplyScalar(1.22);
    ringGroup.add(kl);
  }
}

/* 양성자 포획: 바깥에서 들어와 장벽에 멈칫 → 결합 → γ, 이후 고리를 따라 다음 정거장으로 */
function captureStep(k, opts) {
  const [Z, N] = CNO_NUC[k];
  return {
    title: opts.title, eq: opts.eq, desc: opts.desc, Q: opts.Q, nu: 0, dur: opts.alpha ? 12 : 10, cam: [0, 12.5, 12.5], station: k,
    build(c) {
      c.nuc = new Nucleus(typesOf([Z, N]), stationPos(k));
      const out = stationPos(k).normalize();
      c.dir = out.clone().multiplyScalar(0.85).add(new V3(0, 0.55, 0)).normalize();
      c.p = new Nucleus(["p"], stationPos(k).addScaledVector(c.dir, 10));
    },
    update(c, t) {
      if (!c.fused) {
        c.nuc.pos.copy(stationPos(k));
        const gap = approachGap(t, 2.6, 10, c.nuc.radius + 1.5);
        c.p.pos.copy(stationPos(k)).addScaledVector(c.dir, gap);
        if (t > 2.2) c.once("bar", () => {
          c.bar = new Barrier(stationPos(k), c.nuc.radius + 1.2, "쿨롱 장벽 (전하 " + Z + ")");
          if (k === 0) c.caption("탄소의 전하는 +6 — 양성자끼리보다 <b>장벽이 훨씬 높다</b>. 그래서 더 뜨거운 별이 필요하다");
        });
        if (t > 4.4) c.once("fuse", () => {
          c.bar.pop();
          c.nuc.absorb(c.p);
          c.fused = true;
          new Flash(stationPos(k), 0xffc080, 3.6);
          if (!opts.alpha) {
            new Gamma(stationPos(k), c.dir.clone().negate().add(new V3(0, 0.9, 0)).normalize(), { label: true });
            c.caption(opts.cap);
          }
        });
      } else if (opts.alpha) {
        if (t > 5.4) c.once("alpha", () => {
          c.al = c.nuc.split(2, 2);
          c.al0 = c.al.pos.clone();
          new Flash(stationPos(k), 0xffd27a, 4.5);
          c.caption(opts.cap);
        });
        if (c.al) {
          // 바깥쪽·위로 — 카메라 쪽으로 날아오지 않게
          c.al.pos.copy(c.al0).addScaledVector(stationPos(k).normalize().add(new V3(0, 1.3, 0)).normalize(), easeOut(seg(t, 5.4, 9)) * 4.5);
          c.al.halo.material.opacity = 0.5 + 0.2 * Math.sin(t * 5);
          const f = easeInOut(seg(t, 7.4, 11));
          c.nuc.pos.copy(arcPos(k, f));
          if (t > 10.9) c.once("home", () => c.caption("<b>¹²C 가 처음 자리로</b> — 탄소는 쓰이지 않고 돌아온다. 촉매다"));
        } else c.nuc.pos.copy(stationPos(k));
      } else {
        c.nuc.pos.copy(arcPos(k, easeInOut(seg(t, 6.6, 9.6))));
      }
    },
  };
}
/* β⁺ 붕괴: 기다리다 → 양성자 하나가 중성자로, e⁺ + νₑ → 다음 정거장 */
function decayStep(k, opts) {
  const [Z, N] = CNO_NUC[k];
  return {
    title: opts.title, eq: opts.eq, desc: opts.desc, Q: opts.Q, nu: opts.nu, dur: 10.5, cam: [0, 12.5, 12.5], station: k,
    build(c) {
      c.nuc = new Nucleus(typesOf([Z, N]), stationPos(k));
      c.caption(opts.wait);
    },
    update(c, t) {
      if (t < 6.8) c.nuc.pos.copy(stationPos(k)).add(new V3(Math.sin(t * 31) * 0.04, Math.sin(t * 27) * 0.04, 0)); // 불안정한 떨림
      c.nuc.halo.material.opacity = t < 2.4 ? 0.38 + 0.3 * Math.abs(Math.sin(t * 5)) : 0.38;
      if (t > 2.4) c.once("decay", () => {
        const w = c.nuc.convert();
        new Flash(w, 0x9fd0ff, 2.2, false);
        const out = stationPos(k).normalize();
        new Neutrino(w, out.clone().add(new V3(0, 1.1, 0)).normalize());
        c.caption(opts.cap);
      });
      if (t > 2.5) annihilation(c, "b", stationPos(k).add(new V3(0, 0.8, 0)), t, 2.6, stationPos(k).normalize().add(new V3(0, 0.7, 0)).normalize());
      if (t >= 6.8) c.nuc.pos.copy(arcPos(k, easeInOut(seg(t, 6.8, 10))));
    },
  };
}

const CNO = [
  captureStep(0, {
    title: "① 탄소-12 가 양성자를 잡는다", eq: C12 + " + " + H1 + AR + N13 + " + " + GM + q("1.94"), Q: 1.944,
    desc: "순환은 <b>탄소-12</b> 에서 시작한다. 전하가 +6 이라 쿨롱 장벽이 양성자끼리보다 훨씬 높아, 중심 온도가 <b>약 1700만 K</b> 를 넘는 별에서야 p-p 연쇄를 앞선다.",
    cap: "¹²C + p → <b>¹³N</b> + γ",
  }),
  decayStep(1, {
    title: "② 질소-13 의 β⁺ 붕괴", eq: N13 + AR + C13 + " + " + EP + " + " + NU + q("2.22"), Q: 2.221, nu: 0.707,
    desc: "질소-13 은 불안정하다 (<b>반감기 약 10분</b>). 핵 속 양성자 하나가 중성자로 바뀌며 양전자와 중성미자를 내놓는다 — p-p 의 ①번과 같은 약한 상호작용.",
    wait: "¹³N 은 불안정 — 반감기 약 <b>10분</b>을 기다린다", cap: "<b>β⁺ 붕괴</b>: 양성자 → 중성자 + e⁺ + νₑ — ¹³N 이 <b>¹³C</b> 로",
  }),
  captureStep(2, {
    title: "③ 탄소-13 + 양성자 → 질소-14", eq: C13 + " + " + H1 + AR + N14 + " + " + GM + q("7.55"), Q: 7.551,
    desc: "두 번째 양성자를 붙잡는다. 이번에도 남는 에너지는 감마선으로.", cap: "¹³C + p → <b>¹⁴N</b> + γ",
  }),
  captureStep(3, {
    title: "④ 질소-14 + 양성자 → 산소-15", eq: N14 + " + " + H1 + AR + O15 + " + " + GM + q("7.30"), Q: 7.297,
    desc: "순환에서 <b>가장 느린 단계</b> — 병목이다. 그래서 오래 탄 별 속의 C·N·O 는 대부분 <b>¹⁴N</b> 으로 쌓인다. 우리 몸의 질소도 상당 부분 이렇게 만들어졌다.",
    cap: "¹⁴N + p → <b>¹⁵O</b> + γ — 순환에서 가장 느린 고개",
  }),
  decayStep(4, {
    title: "⑤ 산소-15 의 β⁺ 붕괴", eq: O15 + AR + N15 + " + " + EP + " + " + NU + q("2.75"), Q: 2.754, nu: 0.997,
    desc: "산소-15 도 불안정하다 (<b>반감기 약 2분</b>). 다시 양성자 하나가 중성자로.",
    wait: "¹⁵O 도 불안정 — 반감기 약 <b>2분</b>", cap: "<b>β⁺ 붕괴</b>: ¹⁵O → <b>¹⁵N</b> + e⁺ + νₑ",
  }),
  captureStep(5, {
    title: "⑥ 질소-15 + 양성자 → 탄소-12 + 헬륨-4", eq: N15 + " + " + H1 + AR + C12 + " + " + He4 + q("4.97"), Q: 4.966, alpha: true,
    desc: "네 번째 양성자가 들어오면 <b>알파 입자(⁴He)</b> 가 떨어져 나가고, 남은 탄소-12 가 고리의 처음 자리로 돌아온다.",
    cap: "알파 입자 <b>⁴He</b> 가 떨어져 나간다!",
  }),
  {
    title: "합계 — 탄소는 촉매", eq: "4" + H1 + AR + He4 + " + 2" + EP + " + 2" + NU + q("26.7"),
    desc: "¹²C·¹³N·¹³C·¹⁴N·¹⁵O·¹⁵N 은 한 바퀴 돌아 그대로 남는 <b>촉매</b>다. 결과는 p-p 연쇄와 똑같다. " +
      "태양보다 <b>약 1.3배 이상 무거운 별</b>의 주 에너지원이며, 태양에서는 약 1%. 2020년 <b>Borexino</b> 실험이 태양의 CNO 중성미자를 처음 검출했다.",
    Q: 0, nu: 0, dur: 10, cam: [0, 14, 11], summary: true,
    build(c) {
      c.c = new Nucleus(typesOf(CNO_NUC[0]), stationPos(0));
      c.runner = glowSprite(0xffe0a0, 2.2, 1);
      ringGroup.add(c.runner);
      c.caption("양성자 4개가 고리를 한 바퀴 돌며 들어가고 — <b>⁴He 하나</b>가 나온다");
    },
    update(c, t) {
      const a = (t / 6) * Math.PI * 2;
      c.runner.position.set(RING_R * Math.sin(a), 0, -RING_R * Math.cos(a));
      c.c.pos.copy(stationPos(0));
      if (t > 6.2) c.once("he", () => {
        c.he = new Nucleus(["p", "n", "p", "n"], new V3(0, 0, 0));
        new Flash(new V3(), 0xfff0c0, 6.5);
        for (let i = 0; i < 6; i++) new Gamma(new V3(), randDir(), { speed: 10, label: i === 0 });
        new Neutrino(new V3(), randDir()); new Neutrino(new V3(), randDir());
        c.caption("헬륨 1개 + 26.7 MeV — 그리고 <b>¹²C 는 그대로</b>");
        ringGroup.remove(c.runner);
      });
      if (c.he) c.he.halo.material.opacity = 0.5 + 0.25 * Math.sin(t * 3);
    },
    cleanup(c) { if (c.runner && c.runner.parent) ringGroup.remove(c.runner); },
  },
];

/* ═══════════════════════════════════════════════════════════════
   8. 재생기
   ═══════════════════════════════════════════════════════════════ */
const el = (id) => document.getElementById(id);
const Play = { mode: "pp", idx: 0, t: 0, playing: true, speed: 1, ctx: null, view: "star", energy: [] };
const stepsOf = () => (Play.mode === "pp" ? PP : CNO);

let capTimer = 0;
function caption(html) {
  const c = el("caption");
  c.innerHTML = html;
  c.classList.add("on");
  capTimer = 5.5;
}
function makeCtx() {
  const fired = new Set();
  return { once(k, fn) { if (!fired.has(k)) { fired.add(k); fn(); } }, caption };
}
function startStep(i) {
  const steps = stepsOf();
  if (Play.ctx && Play.cur && Play.cur.cleanup) Play.cur.cleanup(Play.ctx);
  clearActors();
  Play.idx = (i + steps.length) % steps.length;
  Play.t = 0;
  Play.cur = steps[Play.idx];
  Play.ctx = makeCtx();
  Play.cur.build(Play.ctx);
  // 에너지 누계: 이 단계 앞까지의 합
  Play.energy = steps.slice(0, Play.idx).filter((s) => !s.summary);
  renderStepUI();
  renderEnergy(false);
  if (Play.view === "core") flyTo(camFor(Play.cur), aimFor(), 1.6);
  stationLabels.forEach((l, k) => l.element.classList.toggle("on", Play.cur.station === k));
}
function finishStep() {
  if (!Play.cur.summary) { Play.energy.push(Play.cur); renderEnergy(true); }
  startStep(Play.idx + 1);
}

function renderStepUI() {
  const s = Play.cur, steps = stepsOf();
  el("stepNo").textContent = (Play.mode === "pp" ? "p-p 연쇄 · " : "CNO 순환 · ") + (s.summary ? "정리" : "STEP " + (Play.idx + 1) + " / " + steps.filter((x) => !x.summary).length);
  el("stepTitle").textContent = s.title;
  el("stepEq").innerHTML = s.eq;
  el("stepDesc").innerHTML = s.desc;
  el("steps").innerHTML = steps.map((x, k) =>
    '<li class="' + (k < Play.idx ? "done" : "") + '"><button data-k="' + k + '" aria-current="' + (k === Play.idx) + '"><span class="n">' +
    (x.summary ? "Σ" : k + 1) + '</span><span class="e">' + x.eq.replace(/<span class="q">.*?<\/span>/, "") + "</span>" +
    '<span class="mev">' + (x.Q ? x.Q.toFixed(2) : "") + "</span></button></li>").join("");
  el("steps").querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => startStep(+b.dataset.k)));
}
const EBAR = ["#ff7a3c", "#ffb347", "#ffe066", "#ffd0a0", "#ff9a6a", "#ffc46b"];
function renderEnergy() {
  const heat = Play.energy.reduce((s, x) => s + x.Q - x.nu, 0), nu = Play.energy.reduce((s, x) => s + x.nu, 0);
  const total = 26.73;
  el("ebar").innerHTML = Play.energy.map((x, k) =>
    '<i style="width:' + ((x.Q - x.nu) / total) * 100 + "%;background:" + EBAR[k % EBAR.length] + '"></i>' +
    (x.nu ? '<i style="width:' + (x.nu / total) * 100 + '%;background:#a6ff7a;opacity:.7"></i>' : "")).join("");
  el("eHeat").textContent = heat.toFixed(2) + " MeV";
  el("eNu").textContent = nu.toFixed(2) + " MeV" + (Play.energy.length === stepsOf().length - 1 ? "  · 합계 " + (heat + nu).toFixed(2) + " MeV" : "");
}

function setMode(m) {
  Play.mode = m;
  el("tabs").querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
  ringGroup.visible = m === "cno" && Play.view === "core";
  startStep(0);
}
function setPlaying(p) {
  Play.playing = p;
  el("bPlay").innerHTML = p ? "&#10074;&#10074;" : "&#9654;";
}

/* ═══════════════════════════════════════════════════════════════
   9. 카메라 이동 · 별 ↔ 핵
   ═══════════════════════════════════════════════════════════════ */
let fly = null;
/* 세로로 긴 화면에서는 가로 폭이 모자라므로 뒤로 물러선다 */
const narrowK = () => (camera.aspect < 1 ? Math.min(2.2, 1.1 / camera.aspect) : 1);
const camFor = (s) => new V3(...s.cam).multiplyScalar(narrowK()).add(aimFor());
const aimFor = () => new V3(0, camera.aspect < 1 ? -2 : 0, 0); // 좁은 화면: 아래 패널을 피해 장면을 위로
const STAR_CAM = () => new V3(170, 70, 190).multiplyScalar(narrowK());
function flyTo(pos, target, dur, onDone) {
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), u: 0, dur, onDone };
}
function enterCore() {
  if (Play.view === "core") return;
  Play.view = "diving";
  el("diveBox").hidden = true;
  controls.autoRotate = false;
  flyTo(new V3(10, 6, 34), new V3(0, 0, 0), 3.4, () => {
    Play.view = "core";
    starGroup.visible = false;
    controls.autoRotate = el("btnRot").getAttribute("aria-pressed") === "true";
    controls.autoRotateSpeed = 0.25;
    controls.maxDistance = 70;
    el("panel").classList.remove("off");
    el("tcard").classList.remove("off");
    el("legend").hidden = false;
    el("views").classList.remove("starmode");
    ringGroup.visible = Play.mode === "cno";
    startStep(Play.idx);
  });
  coreGroup.visible = true;
}
function leaveCore() {
  if (Play.view === "star") return;
  clearActors();
  Play.view = "star";
  starGroup.visible = true;
  ringGroup.visible = false;
  el("panel").classList.add("off");
  el("tcard").classList.add("off");
  el("legend").hidden = true;
  el("caption").classList.remove("on");
  el("views").classList.add("starmode");
  controls.maxDistance = 600;
  flyTo(STAR_CAM(), new V3(0, 0, 0), 2.6, () => { el("diveBox").hidden = false; coreGroup.visible = false; controls.autoRotateSpeed = 0.35; });
}

/* ═══════════════════════════════════════════════════════════════
   10. 온도 — p-p 와 CNO 중 누가 앞서나
   근사: ε_pp ∝ T⁴, ε_CNO ∝ T²⁰ (Carroll & Ostlie), 두 값이 1700만 K 에서 같다고 맞춤
   ═══════════════════════════════════════════════════════════════ */
const T_CROSS = 17;
const epp = (T) => Math.pow(T / T_CROSS, 4), ecno = (T) => Math.pow(T / T_CROSS, 20);
function drawChart(T) {
  const cv = el("tChart"), g = cv.getContext("2d"), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  const x0 = 46, x1 = W - 12, y0 = H - 34, y1 = 12;
  const Tmin = 8, Tmax = 40, Lmin = -7, Lmax = 8;
  const X = (t) => x0 + ((t - Tmin) / (Tmax - Tmin)) * (x1 - x0);
  const Y = (v) => y0 - ((Math.log10(v) - Lmin) / (Lmax - Lmin)) * (y0 - y1);
  g.font = "20px JetBrains Mono, monospace";
  g.strokeStyle = "rgba(255,200,150,.18)"; g.lineWidth = 1.5;
  for (const t of [10, 15, 20, 25, 30, 35, 40]) { g.beginPath(); g.moveTo(X(t), y0); g.lineTo(X(t), y1); g.stroke(); g.fillStyle = "rgba(255,220,190,.55)"; g.fillText(String(t), X(t) - 11, H - 8); }
  g.fillText("MK", x1 - 34, y0 - 8);
  g.save(); g.translate(16, (y0 + y1) / 2 + 60); g.rotate(-Math.PI / 2); g.fillText("에너지 생성률 (로그)", 0, 0); g.restore();
  const curve = (f, col) => { g.beginPath(); for (let t = Tmin; t <= Tmax; t += 0.25) { const y = Math.max(y1, Math.min(y0, Y(f(t)))); t === Tmin ? g.moveTo(X(t), y) : g.lineTo(X(t), y); } g.strokeStyle = col; g.lineWidth = 4; g.stroke(); };
  curve(epp, "#ff7a45"); curve(ecno, "#5ff7ff");
  g.fillStyle = "#ff9a6a"; g.fillText("p-p ∝ T⁴", X(9), Y(epp(9)) - 12);
  g.fillStyle = "#7ff9ff"; g.fillText("CNO ∝ T²⁰", X(25.5), Y(ecno(24)) + 6);
  // 태양
  g.setLineDash([6, 6]); g.strokeStyle = "rgba(255,210,122,.8)"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(X(15.7), y0); g.lineTo(X(15.7), y1); g.stroke(); g.setLineDash([]);
  g.fillStyle = "#ffd27a"; g.fillText("태양", X(15.7) - 58, y1 + 20);
  // 현재 온도
  g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X(T), y0); g.lineTo(X(T), y1); g.stroke();
  for (const [f, c] of [[epp, "#ff7a45"], [ecno, "#5ff7ff"]]) { g.beginPath(); g.arc(X(T), Math.max(y1, Math.min(y0, Y(f(T)))), 7, 0, 7); g.fillStyle = c; g.fill(); }
}
function setTemp(T) {
  coreUniforms.uTemp.value = T;
  el("tVal").textContent = Math.round(T * 100).toLocaleString("ko-KR") + "만 K";
  const share = ecno(T) / (epp(T) + ecno(T));
  el("tVerdict").innerHTML = (share < 0.5 ? "<b>p-p 연쇄</b>가 앞선다" : "<b>CNO 순환</b>이 앞선다") +
    " — 이 온도에서 CNO 의 몫 약 <b>" + (share * 100 < 1 ? (share * 100).toFixed(2) : Math.round(share * 100)) + "%</b> (근사식). " +
    (Math.abs(T - 15.7) < 0.3 ? "태양 중심이 바로 이 온도다. 태양 전체로는 CNO 가 약 1%." : T > T_CROSS ? "태양보다 무거운 별의 중심은 이만큼 뜨겁다." : "작고 차가운 별일수록 p-p 연쇄만으로 탄다.");
  drawChart(T);
}

/* ═══════════════════════════════════════════════════════════════
   11. 입력 · 루프
   ═══════════════════════════════════════════════════════════════ */
el("btnDive").addEventListener("click", enterCore);
el("btnCore").addEventListener("click", enterCore);
el("btnStar").addEventListener("click", leaveCore);
el("btnRot").addEventListener("click", (e) => {
  const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
  e.currentTarget.setAttribute("aria-pressed", String(on));
  controls.autoRotate = on;
});
el("tabs").querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
el("bPlay").addEventListener("click", () => setPlaying(!Play.playing));
el("bNext").addEventListener("click", () => startStep(Play.idx + 1));
el("bPrev").addEventListener("click", () => startStep(Play.idx - 1));
el("bRestart").addEventListener("click", () => startStep(0));
el("speeds").querySelectorAll("[data-sp]").forEach((b) => b.addEventListener("click", () => {
  Play.speed = +b.dataset.sp;
  el("speeds").querySelectorAll("[data-sp]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
}));
el("tSlider").addEventListener("input", (e) => setTemp(+e.target.value));
el("tMin").addEventListener("click", () => { const c = el("tcard"); c.classList.toggle("mini"); el("tMin").innerHTML = c.classList.contains("mini") ? "+" : "&#8211;"; });
/* 패널: 목록 · 접기 — 장면을 가리지 않도록 */
function togglePanel(cls, btn, on) {
  const p = el("panel");
  on = on === undefined ? !p.classList.contains(cls) : on;
  p.classList.toggle(cls, on);
  el(btn).setAttribute("aria-pressed", String(on));
  if (btn === "bSlim") el(btn).textContent = on ? "펴기" : "접기";
}
el("bList").addEventListener("click", () => togglePanel("list", "bList"));
el("bSlim").addEventListener("click", () => togglePanel("slim", "bSlim"));
/* 오른쪽 패널이 차지한 만큼 투영 중심을 왼쪽으로 옮겨, 반응이 비어 있는 화면 한가운데 오게 한다 */
let viewOff = 0;
function updateViewOffset(real) {
  const p = el("panel");
  const wide = innerWidth >= 860 && !p.classList.contains("off");
  const goal = wide ? (innerWidth - p.getBoundingClientRect().left) / 2 : 0;
  viewOff += (goal - viewOff) * Math.min(1, real * 4);
  if (Math.abs(goal - viewOff) < 0.5) viewOff = goal;
  if (viewOff > 0.5) camera.setViewOffset(innerWidth, innerHeight, viewOff, 0, innerWidth, innerHeight);
  else if (camera.view && camera.view.enabled) camera.clearViewOffset();
  document.documentElement.style.setProperty("--pw", (viewOff * 2).toFixed(0) + "px");
}
addEventListener("keydown", (e) => {
  if (e.target.matches("input")) return;
  if (e.code === "Space") { setPlaying(!Play.playing); e.preventDefault(); }
  if (e.key === "ArrowRight") startStep(Play.idx + 1);
  if (e.key === "ArrowLeft") startStep(Play.idx - 1);
});

/* CSS2DRenderer(r128)는 자기 visible 만 본다 — 숨긴 그룹 안의 라벨도 감춘다 */
function hideOrphanLabels() {
  scene.traverse((o) => {
    if (!o.isCSS2DObject) return;
    for (let p = o; p; p = p.parent) if (!p.visible) { o.element.style.display = "none"; return; }
  });
}
const clock = new THREE.Clock();
let time = 0;
function frame() {
  const real = Math.min(clock.getDelta(), 0.05);
  time += real;
  starUniforms.uTime.value = time;
  coreUniforms.uTime.value = time;

  if (fly) {
    fly.u = Math.min(1, fly.u + real / fly.dur);
    const k = easeInOut(fly.u);
    camera.position.lerpVectors(fly.p0, fly.p1, k);
    controls.target.lerpVectors(fly.t0, fly.t1, k);
    if (fly.u >= 1) { const f = fly.onDone; fly = null; if (f) f(); }
  }
  // 별 ↔ 핵 크로스페이드: 카메라가 별 반지름 안으로 들어오면 별을 걷어 낸다
  const dist = camera.position.length();
  const inside = clamp01((STAR_R * 1.5 - dist) / (STAR_R * 1.1));
  starUniforms.uFade.value = 1 - inside;
  corona.material.opacity = 0.55 * (1 - inside);
  corona2.material.opacity = 0.35 * (1 - inside);
  coreUniforms.uFade.value = inside;
  starLabels.forEach((l) => { l.element.style.opacity = 1 - clamp01(inside * 3); });
  if (bloom) { bloom.strength = lerp(0.75, 0.8, inside); bloom.threshold = lerp(0.62, 0.78, inside); }

  if (Play.view === "core" && Play.cur) {
    const dt = Play.playing ? real * Play.speed : 0;
    if (Play.playing) {
      Play.t += dt;
      Play.cur.update(Play.ctx, Play.t);
      if (Play.t >= Play.cur.dur) finishStep();
    }
    for (const a of [...actors]) a.update(dt);
    el("prog").style.width = Math.min(100, (Play.t / Play.cur.dur) * 100) + "%";
    if (capTimer > 0) { capTimer -= dt; if (capTimer <= 0) el("caption").classList.remove("on"); }
  }

  updateViewOffset(real);
  controls.update();
  if (composer) composer.render(); else renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  hideOrphanLabels();
  requestAnimationFrame(frame);
}

/* 주소로 바로: ?core · ?mode=cno · ?step=3 · ?t=4 (그 단계의 4초로) · ?pause */
const QS = new URLSearchParams(location.search);
setTemp(15.7);
el("tcard").classList.add("mini"); el("tMin").textContent = "+"; // 온도 카드는 접힌 채 시작
if (innerHeight < 760 || innerWidth < 860) togglePanel("slim", "bSlim", true);
Play.mode = QS.get("mode") === "cno" ? "cno" : "pp";
el("tabs").querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === Play.mode)));
Play.idx = Math.max(0, (+QS.get("step") || 1) - 1);
Play.cur = stepsOf()[Play.idx];
renderStepUI();
renderEnergy();
if (QS.has("core")) {
  camera.position.set(10, 6, 34);
  el("diveBox").hidden = true;
  enterCore();
  fly = null;
  Play.view = "core";
  starGroup.visible = false;
  el("panel").classList.remove("off"); el("tcard").classList.remove("off"); el("legend").hidden = false;
  ringGroup.visible = Play.mode === "cno";
  startStep(Play.idx);
  camera.position.copy(camFor(Play.cur));
  controls.target.copy(aimFor());
  fly = null;
  const ff = +QS.get("t") || 0;
  for (let s = 0; s < ff; s += 1 / 30) { Play.t += 1 / 30; Play.cur.update(Play.ctx, Play.t); for (const a of [...actors]) a.update(1 / 30); }
  if (QS.has("pause")) setPlaying(false);
} else {
  el("views").classList.add("starmode");
  camera.position.copy(STAR_CAM());
}
requestAnimationFrame(frame);
</script>
</body>
</html>
