import { Component } from 'react';

let spriteIds = new Set();
const MS = ({ children, style, ...rest }) => {
  if (typeof children === 'string' && spriteIds.has(children)) {
    return <svg style={{ width: '1em', height: '1em', fill: 'currentColor', ...style }} {...rest}><use href={`#${children}`} /></svg>;
  }
  return <span className="ms" style={style} {...rest}>{children}</span>;
};

export default class App extends Component {
  state = {
    lang: 'he',
    cfg: null,
    booting: true,
    menuOpen: false,
    notifOpen: false,
    browser: { open: false, variant: null, item: null, loading: false },
    sheet: { open: false, kind: null, item: null },
    toast: { show: false, text: '', icon: 'check_circle' },
  };

  get cfg() { return this.state.cfg; }
  get isHE() { return this.state.lang === 'he'; }
  L(o) { return o ? (o[this.state.lang] ?? o.he) : ''; }

  async componentDidMount() {
    try {
      const [{ city, lang }, sprite] = await Promise.all([
        fetch('./config.json').then(r => r.json()),
        fetch('./sprite.svg').then(r => r.ok ? r.text() : '').catch(() => ''),
      ]);
      if (sprite) {
        spriteIds = new Set([...sprite.matchAll(/<symbol[^>]+id="([^"]+)"/g)].map(m => m[1]));
        const host = document.createElement('div');
        host.innerHTML = sprite;
        if (host.firstChild) document.body.appendChild(host.firstChild);
      }
      const cfg = await fetch(`./cities/${city}.json`).then(r => r.json());
      this.setState({ cfg, lang }, () => this.boot());
      this.checkRemote(city, cfg);
    } catch (e) {
      this.setState({ loadError: String(e) });
    }
  }

  checkRemote = async (city, local) => {
    try {
      const url = `https://raw.githubusercontent.com/omer72/municipality-app/main/app/public/cities/${city}.json`;
      const remote = await fetch(url, { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
      if (remote && (remote.version ?? 0) > (local.version ?? 0)) {
        this.setState({ cfg: remote });
        this.showToast(this.isHE ? `התצורה עודכנה לגרסה ${remote.version}` : `Updated to v${remote.version}`, 'cloud_done');
      }
    } catch {}
  };
  componentWillUnmount() {
    clearTimeout(this._bt); clearTimeout(this._lt); clearTimeout(this._tt);
  }

  boot = () => {
    clearTimeout(this._bt);
    this.setState({
      booting: true, menuOpen: false, notifOpen: false,
      browser: { open: false, variant: null, item: null, loading: false },
      sheet: { open: false, kind: null, item: null },
    });
    this._bt = setTimeout(() => this.setState({ booting: false }), 3000);
  };

  openMenu = () => this.setState({ menuOpen: true });
  closeMenu = () => this.setState({ menuOpen: false });
  openNotif = () => this.setState({ notifOpen: true });
  closeNotif = () => this.setState({ notifOpen: false });

  openBrowser = (variant, item) => {
    this.setState({ menuOpen: false, browser: { open: true, variant, item, loading: true } });
    clearTimeout(this._lt);
    this._lt = setTimeout(() => this.setState(s => ({ browser: { ...s.browser, loading: false } })), 750);
  };
  closeBrowser = () => this.setState(s => ({ browser: { ...s.browser, open: false } }));
  reloadBrowser = () => {
    this.setState(s => ({ browser: { ...s.browser, loading: true } }));
    clearTimeout(this._lt);
    this._lt = setTimeout(() => this.setState(s => ({ browser: { ...s.browser, loading: false } })), 700);
  };

  openSheet = (kind, item) => this.setState({ menuOpen: false, sheet: { open: true, kind, item } });
  closeSheet = () => this.setState(s => ({ sheet: { ...s.sheet, open: false } }));
  confirmSheet = () => {
    const { kind, item } = this.state.sheet;
    this.closeSheet();
    const digits = (item.url || '').replace(/\D/g, '');
    if (kind === 'phone') window.location.href = 'tel:' + digits;
    else if (kind === 'whatsapp') window.location.href = 'whatsapp://send?phone=' + digits;
    else if (kind === 'app') {
      const m = (item.url || '').match(/id(\d+)/);
      if (m) window.location.href = 'itms-apps://itunes.apple.com/app/id' + m[1];
    }
  };

  showToast = (text, icon) => {
    this.setState({ toast: { show: true, text, icon } });
    clearTimeout(this._tt);
    this._tt = setTimeout(() => this.setState(s => ({ toast: { ...s.toast, show: false } })), 1900);
  };

  handleItem = (it) => {
    if (it.type === 'screen') {
      this.setState({ menuOpen: false, notifOpen: it.target === 'notifications' });
      return;
    }
    if (it.type === 'inapp') return this.openBrowser('app', it);
    if (it.type === 'website') return this.openBrowser('safari', it);
    if (it.type === 'phone') return this.openSheet('phone', it);
    if (it.type === 'whatsapp') return this.openSheet('whatsapp', it);
    if (it.type === 'app') return this.openSheet('app', it);
  };

  badgeFor(type) {
    return { website: 'open_in_new', phone: 'call', whatsapp: 'chat', app: 'install_mobile' }[type] || '';
  }

  render() {
    if (this.state.loadError) return <div style={{position:'fixed',inset:0,background:'#13643A',color:'#fff',padding:24,fontFamily:'Rubik,system-ui',fontSize:14,whiteSpace:'pre-wrap'}}>Config failed to load:{'\n'}{this.state.loadError}</div>;
    if (!this.state.cfg) return <div style={{position:'fixed',inset:0,background:'#13643A',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:32,height:32,border:'3px solid rgba(255,255,255,.35)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite'}}/></div>;
    const c = this.cfg, t = c.theme, he = this.isHE, lang = this.state.lang, s = this.state;
    const tint = t.primary + '14';
    const headerBg = `linear-gradient(135deg, ${t.primary}, ${t.primaryDark})`;
    const accent = t.accent;
    const surface = t.surface;
    const headerShadow = t.primary + '40';

    const buttons = c.buttons.map((b, i) => ({
      key: i, icon: b.icon, title: this.L(b.title), tint, iconColor: t.primary,
      badge: this.badgeFor(b.type),
      badgeSide: he ? 'left' : 'right',
      badgeBg: b.type === 'phone' || b.type === 'whatsapp' ? '#E8F5EC' : t.accent + '22',
      badgeColor: b.type === 'phone' || b.type === 'whatsapp' ? '#1F8A4C' : t.primaryDark,
      onTap: () => this.handleItem(b),
    }));

    const menuItems = c.menu.map((m, i) => ({
      key: i, icon: m.icon, title: this.L(m.title), iconColor: t.primary,
      trail: m.type === 'website' ? 'open_in_new' : (he ? 'chevron_left' : 'chevron_right'),
      onTap: () => this.handleItem(m),
    }));

    const notifs = c.notifs.map((n, i) => ({
      key: i, icon: n.icon, title: this.L(n.title), body: this.L(n.body), time: this.L(n.time),
      tint, iconColor: t.primary,
    }));

    const br = s.browser, variant = br.variant;
    const item = br.item || {};
    const isLive = /^https?:\/\//.test(item.url || '');
    const host = isLive ? new URL(item.url).host : (item.url || '').split('/')[0];
    const mock = item.mock || (variant === 'appstore' ? 'store' : 'site');
    const pageLive = br.open && (variant === 'app' || variant === 'safari') && isLive;
    const pageLogin = br.open && mock === 'login' && !pageLive;
    const pageStore = br.open && (variant === 'appstore' || mock === 'store') && !pageLive;
    const pageSite = br.open && !pageLogin && !pageStore && !pageLive;

    const siteRows = [
      { icon: 'description', title: he ? 'הגשת בקשה מקוונת' : 'Submit an online request', sub: he ? 'מילוי טופס דיגיטלי' : 'Fill out a digital form' },
      { icon: 'schedule', title: he ? 'זימון תור' : 'Book an appointment', sub: he ? 'בחירת מועד פנוי' : 'Pick an available slot' },
      { icon: 'download', title: he ? 'הורדת מסמכים' : 'Download documents', sub: he ? 'אישורים ותעודות' : 'Permits & certificates' },
      { icon: 'help', title: he ? 'שאלות נפוצות' : 'Frequently asked', sub: he ? 'מידע ותמיכה' : 'Info & support' },
    ];

    const sheet = s.sheet, sit = sheet.item || {};
    let sheetIcon = 'call', sheetTitle = '', sheetSub = '', sheetBtn = '', sheetIconBg = '#E8F5EC', sheetIconColor = '#1F8A4C';
    if (sheet.kind === 'phone') {
      sheetIcon = 'call'; sheetTitle = this.L(sit.title); sheetSub = sit.url;
      sheetBtn = he ? 'התקשר' : 'Call'; sheetIconBg = '#E8F5EC'; sheetIconColor = '#27A75B';
    } else if (sheet.kind === 'whatsapp') {
      sheetIcon = 'chat'; sheetTitle = 'WhatsApp'; sheetSub = sit.url;
      sheetBtn = he ? 'פתח את WhatsApp' : 'Open WhatsApp'; sheetIconBg = '#E3F7EC'; sheetIconColor = '#25D366';
    } else if (sheet.kind === 'app') {
      sheetIcon = 'smart_toy'; sheetTitle = 'KidsIt — AI Parent Coach'; sheetSub = 'apps.apple.com';
      sheetBtn = he ? 'הצג ב-App Store' : 'View in App Store'; sheetIconBg = '#EEF0FF'; sheetIconColor = '#6366f1';
    }

    const statusDark = !(br.open && (variant === 'safari' || variant === 'appstore'));
    const mName = c.name[lang], mSub = c.sub[lang];
    const greeting = he ? 'מה תרצו לעשות היום?' : 'How can we help today?';
    const greetingSub = he ? 'כל השירותים העירוניים במקום אחד' : 'All city services in one place';
    const footerNote = he ? 'התצורה נטענה מהענן' : 'Configuration loaded from cloud';
    const notifTitle = he ? 'התראות' : 'Notifications';
    const backIcon = he ? 'arrow_forward' : 'arrow_back';
    const chevron = he ? 'chevron_left' : 'chevron_right';
    const poweredBy = he ? 'מופעל ע״י CityApp' : 'Powered by CityApp';
    const versionLine = (he ? 'גרסה ' : 'v') + (c.version ?? '?') + ' · ' + c.file;
    const doneLabel = he ? 'סיום' : 'Done';
    const pageBg = pageStore || pageSite ? '#fff' : t.surface;
    const cancelLabel = he ? 'ביטול' : 'Cancel';
    const bootText = he ? 'מתחבר לענן וטוען תצורה…' : 'Connecting to cloud · loading config…';
    const liveBadge = he ? 'חי' : 'live';

    return (
      <div dir={he ? 'rtl' : 'ltr'} style={{
        position: 'relative', width: '100dvw', height: '100dvh', overflow: 'hidden',
        background: surface, fontFamily: "'Rubik',sans-serif",
      }}>

              {/* HOME */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  background: headerBg, padding: '60px 18px 22px', color: '#fff',
                  flexShrink: 0, boxShadow: `0 6px 20px ${headerShadow}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div onClick={this.openMenu} className="appbtn" style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <MS style={{ fontSize: 25, color: '#fff' }}>menu</MS>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.15 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 500, opacity: .85 }}>{mSub}</div>
                      <div style={{ fontSize: 19, fontWeight: 700 }}>{mName}</div>
                    </div>
                    <div onClick={this.openNotif} className="appbtn" style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                      <MS style={{ fontSize: 24, color: '#fff' }}>notifications</MS>
                      <div style={{
                        position: 'absolute', top: 7, right: 8,
                        minWidth: 16, height: 16, borderRadius: 9,
                        background: accent, border: `2px solid ${t.primaryDark}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9.5, fontWeight: 700, padding: '0 3px',
                      }}>{String(c.notifs.length)}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 18, fontSize: 22, fontWeight: 700 }}>{greeting}</div>
                  <div style={{ fontSize: 13.5, opacity: .9, marginTop: 2 }}>{greetingSub}</div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 40px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 13 }}>
                    {buttons.map(b => (
                      <div key={b.key} onClick={b.onTap} className="appbtn" style={{
                        position: 'relative', background: '#fff', borderRadius: 20,
                        padding: '15px 9px 13px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 10, cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(20,24,40,.06)',
                        border: '1px solid rgba(20,24,40,.04)', minHeight: 122,
                      }}>
                        <div style={{ width: 60, height: 60, borderRadius: 17, background: b.tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MS style={{ fontSize: 36, color: b.iconColor }}>{b.icon}</MS>
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#23272f', textAlign: 'center', lineHeight: 1.2 }}>{b.title}</div>
                        {b.badge && (
                          <div style={{
                            position: 'absolute', top: 9, [b.badgeSide]: 9,
                            width: 21, height: 21, borderRadius: 7, background: b.badgeBg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <MS style={{ fontSize: 13, color: b.badgeColor }}>{b.badge}</MS>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 22, fontSize: 11.5, color: '#aab0bc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <MS style={{ fontSize: 14 }}>cloud_done</MS>{footerNote}
                  </div>
                </div>
              </div>

              {/* NOTIFICATIONS */}
              <div style={{
                position: 'absolute', inset: 0, zIndex: 20, background: surface,
                display: 'flex', flexDirection: 'column',
                transform: `translateY(${s.notifOpen ? '0%' : '100%'})`,
                transition: 'transform .34s cubic-bezier(.32,.72,0,1)',
                pointerEvents: s.notifOpen ? 'auto' : 'none',
              }}>
                <div style={{ background: headerBg, padding: '60px 16px 18px', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div onClick={this.closeNotif} className="appbtn" style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <MS style={{ fontSize: 24, color: '#fff' }}>{backIcon}</MS>
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 700 }}>{notifTitle}</div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {notifs.map(n => (
                    <div key={n.key} style={{ background: '#fff', borderRadius: 17, padding: 14, display: 'flex', gap: 13, boxShadow: '0 2px 10px rgba(20,24,40,.05)' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: n.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MS style={{ fontSize: 23, color: n.iconColor }}>{n.icon}</MS>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 600, color: '#23272f', flex: 1 }}>{n.title}</div>
                          <div style={{ fontSize: 11, color: '#a0a6b2', whiteSpace: 'nowrap' }}>{n.time}</div>
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.45, marginTop: 3 }}>{n.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MENU SCRIM */}
              <div onClick={this.closeMenu} style={{
                position: 'absolute', inset: 0, zIndex: 30,
                background: 'rgba(10,12,20,.42)',
                opacity: s.menuOpen ? 1 : 0,
                transition: 'opacity .3s ease',
                pointerEvents: s.menuOpen ? 'auto' : 'none',
              }} />

              {/* MENU DRAWER */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                left: he ? 'auto' : 0, right: he ? 0 : 'auto',
                width: '80%', zIndex: 31, background: '#fff',
                transform: `translateX(${s.menuOpen ? '0%' : (he ? '100%' : '-100%')})`,
                transition: 'transform .32s cubic-bezier(.32,.72,0,1)',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 0 40px rgba(0,0,0,.25)',
                pointerEvents: s.menuOpen ? 'auto' : 'none',
              }}>
                <div style={{ background: headerBg, padding: '58px 20px 22px', color: '#fff', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <div style={{ width: 50, height: 50, borderRadius: 15, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MS style={{ fontSize: 28, color: '#fff' }}>{t.logoIcon}</MS>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, opacity: .85 }}>{mSub}</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{mName}</div>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
                  {menuItems.map(m => (
                    <div key={m.key} onClick={m.onTap} className="mrow" style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '14px 14px', borderRadius: 13, cursor: 'pointer' }}>
                      <MS style={{ fontSize: 24, color: m.iconColor, width: 26, textAlign: 'center' }}>{m.icon}</MS>
                      <div style={{ flex: 1, fontSize: 15.5, fontWeight: 500, color: '#2a2f38' }}>{m.title}</div>
                      <MS style={{ fontSize: 18, color: '#c2c7d0' }}>{m.trail}</MS>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '16px 20px', borderTop: '1px solid #eef0f3', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <MS style={{ fontSize: 17, color: '#aab0bc' }}>cloud_done</MS>
                  <div style={{ fontSize: 11.5, color: '#9aa0ac', lineHeight: 1.3 }}>{poweredBy}<br />{versionLine}</div>
                </div>
              </div>

              {/* BROWSER OVERLAY */}
              <div style={{
                position: 'absolute', inset: 0, zIndex: 40, background: '#fff',
                display: 'flex', flexDirection: 'column',
                transform: `translateY(${br.open ? '0%' : '100%'})`,
                transition: 'transform .34s cubic-bezier(.32,.72,0,1)',
                pointerEvents: br.open ? 'auto' : 'none',
              }}>
                {variant === 'app' && (
                  <div style={{ background: headerBg, padding: '56px 14px 12px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div onClick={this.closeBrowser} className="appbtn" style={{ fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: '6px 4px' }}>{doneLabel}</div>
                    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{this.L(item.title)}</div>
                      <div style={{ fontSize: 10.5, opacity: .8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}><MS style={{ fontSize: 11 }}>lock</MS>{host}</div>
                    </div>
                    {pageLive && (
                      <div onClick={() => window.open(item.url, '_blank')} className="appbtn" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <MS style={{ fontSize: 20, color: '#fff' }}>open_in_new</MS>
                      </div>
                    )}
                    <div onClick={this.reloadBrowser} className="appbtn" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <MS style={{ fontSize: 21, color: '#fff' }}>refresh</MS>
                    </div>
                  </div>
                )}
                {variant === 'safari' && (
                  <div style={{ background: '#f7f7f9', padding: '54px 12px 11px', borderBottom: '1px solid #e2e3e8', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
                    <div onClick={this.closeBrowser} style={{ fontSize: 15, fontWeight: 600, color: '#0a84ff', cursor: 'pointer', padding: 4 }}>{doneLabel}</div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#e9e9ee', borderRadius: 11, padding: '8px 12px', minWidth: 0 }}>
                      <MS style={{ fontSize: 13, color: '#7d818a' }}>lock</MS>
                      <span style={{ fontSize: 13.5, color: '#3a3d44', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{host}</span>
                    </div>
                    {pageLive && (
                      <MS onClick={() => window.open(item.url, '_blank')} style={{ fontSize: 20, color: '#0a84ff', cursor: 'pointer' }}>open_in_new</MS>
                    )}
                    <MS onClick={this.reloadBrowser} style={{ fontSize: 21, color: '#0a84ff', cursor: 'pointer' }}>refresh</MS>
                  </div>
                )}
                {variant === 'appstore' && (
                  <div style={{ background: '#f7f7f9', padding: '54px 14px 11px', borderBottom: '1px solid #e2e3e8', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <div onClick={this.closeBrowser} style={{ width: 30, height: 30, borderRadius: 15, background: '#e4e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <MS style={{ fontSize: 19, color: '#82868f' }}>close</MS>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e' }}>App Store</div>
                  </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', position: 'relative', background: pageBg }}>
                  {br.loading && (
                    <>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${accent},transparent)`, backgroundSize: '40% 100%', animation: 'spin 1s linear infinite', zIndex: 5 }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4 }}>
                        <div style={{ width: 34, height: 34, border: '3px solid rgba(0,0,0,.1)', borderTopColor: t.primary, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                      </div>
                    </>
                  )}

                  {pageLive && (
                    <iframe
                      src={item.url}
                      onLoad={() => this.setState(s2 => ({ browser: { ...s2.browser, loading: false } }))}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                    />
                  )}

                  {pageLogin && (
                    <div style={{ padding: '34px 26px', textAlign: 'center' }}>
                      <div style={{ width: 66, height: 66, borderRadius: 19, background: headerBg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: `0 6px 18px ${headerShadow}` }}>
                        <MS style={{ fontSize: 36, color: '#fff' }}>{t.logoIcon}</MS>
                      </div>
                      <div style={{ fontSize: 21, fontWeight: 700, color: '#1c2027' }}>{he ? 'כניסה לאזור האישי' : 'Sign in to your account'}</div>
                      <div style={{ fontSize: 13.5, color: '#8a909c', marginTop: 5 }}>{mName} · {he ? 'שירותים מקוונים' : 'Online services'}</div>
                      <div style={{ marginTop: 26, textAlign: 'start', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>{he ? 'מספר תעודת זהות' : 'ID number'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid #dfe2e8', borderRadius: 13, padding: '13px 14px', background: '#fafbfc' }}>
                            <MS style={{ fontSize: 19, color: '#a0a6b2' }}>badge</MS>
                            <span style={{ fontSize: 14.5, color: '#aeb3bd' }}>XXXXXXXXX</span>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>{he ? 'סיסמה' : 'Password'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid #dfe2e8', borderRadius: 13, padding: '13px 14px', background: '#fafbfc' }}>
                            <MS style={{ fontSize: 19, color: '#a0a6b2' }}>lock</MS>
                            <span style={{ fontSize: 14.5, color: '#aeb3bd', letterSpacing: 3 }}>••••••••</span>
                          </div>
                        </div>
                        <div style={{ background: headerBg, borderRadius: 13, padding: 14, textAlign: 'center', color: '#fff', fontSize: 15.5, fontWeight: 600, boxShadow: `0 5px 14px ${headerShadow}`, cursor: 'pointer' }}>{he ? 'כניסה' : 'Sign in'}</div>
                        <div style={{ textAlign: 'center', fontSize: 13, color: t.primary, fontWeight: 500 }}>{he ? 'שכחתי סיסמה' : 'Forgot password?'}</div>
                      </div>
                      <div style={{ marginTop: 30, paddingTop: 16, borderTop: '1px solid #eef0f3', fontSize: 11, color: '#aab0bc', lineHeight: 1.5 }}>{he ? 'מערכת מאובטחת של הרשות המקומית · כל הזכויות שמורות' : 'Secured municipal system · All rights reserved'}</div>
                    </div>
                  )}

                  {pageSite && (
                    <div>
                      <div style={{ background: headerBg, padding: '26px 22px', color: '#fff' }}>
                        <div style={{ fontSize: 11, opacity: .85 }}>{host}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 5 }}>{this.L(item.title)}</div>
                        <div style={{ fontSize: 13.5, opacity: .92, marginTop: 6, lineHeight: 1.5 }}>{he ? 'שירות דיגיטלי מאובטח של העירייה. בחרו את הפעולה הרצויה.' : 'Secured digital service of the municipality. Choose an action below.'}</div>
                      </div>
                      <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                        {siteRows.map((r, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#fff', border: '1px solid #eceef2', borderRadius: 14, padding: 14 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 11, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <MS style={{ fontSize: 22, color: t.primary }}>{r.icon}</MS>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14.5, fontWeight: 600, color: '#23272f' }}>{r.title}</div>
                              <div style={{ fontSize: 12.5, color: '#8a909c', marginTop: 2 }}>{r.sub}</div>
                            </div>
                            <MS style={{ fontSize: 19, color: '#c2c7d0' }}>{chevron}</MS>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pageStore && (
                    <div style={{ padding: '20px 18px 36px' }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ width: 84, height: 84, borderRadius: 20, background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(99,102,241,.4)', flexShrink: 0 }}>
                          <MS style={{ fontSize: 46, color: '#fff' }}>smart_toy</MS>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 19, fontWeight: 700, color: '#1c1c1e', lineHeight: 1.2 }}>KidsIt</div>
                          <div style={{ fontSize: 13, color: '#86868b', marginTop: 1 }}>{he ? 'מאמן הורים מבוסס AI' : 'AI Parenting Coach'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11 }}>
                            <div style={{ background: '#0a84ff', color: '#fff', fontSize: 14, fontWeight: 700, padding: '7px 22px', borderRadius: 20, cursor: 'pointer' }}>{he ? 'קבל' : 'GET'}</div>
                            <MS style={{ fontSize: 24, color: '#0a84ff' }}>ios_share</MS>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 0, marginTop: 22, borderTop: '1px solid #ececef', borderBottom: '1px solid #ececef' }}>
                        <div style={{ flex: 1, textAlign: 'center', padding: '12px 4px', borderRight: '1px solid #ececef' }}>
                          <div style={{ fontSize: 11, color: '#86868b', fontWeight: 600 }}>{he ? '1.2 אלף דירוגים' : '1.2K Ratings'}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', marginTop: 2 }}>4.8 ★</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', padding: '12px 4px', borderRight: '1px solid #ececef' }}>
                          <div style={{ fontSize: 11, color: '#86868b', fontWeight: 600 }}>{he ? 'גיל' : 'Age'}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#1c1c1e', marginTop: 2 }}>4+</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', padding: '12px 4px' }}>
                          <div style={{ fontSize: 11, color: '#86868b', fontWeight: 600 }}>{he ? 'קטגוריה' : 'Category'}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', marginTop: 5 }}>{he ? 'הורות' : 'Parenting'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 11, marginTop: 20, overflowX: 'auto', paddingBottom: 4 }}>
                        <div style={{ width: 124, height: 230, borderRadius: 18, background: 'linear-gradient(160deg,#eef0ff,#dfe3ff)', flexShrink: 0, border: '1px solid #e3e6f5', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 20 }}>
                          <MS style={{ fontSize: 40, color: '#8b8ff0' }}>forum</MS>
                        </div>
                        <div style={{ width: 124, height: 230, borderRadius: 18, background: 'linear-gradient(160deg,#fdeefe,#f7dffb)', flexShrink: 0, border: '1px solid #f0e3f5', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 20 }}>
                          <MS style={{ fontSize: 40, color: '#c87fd8' }}>child_friendly</MS>
                        </div>
                        <div style={{ width: 124, height: 230, borderRadius: 18, background: 'linear-gradient(160deg,#eefcf4,#dff7ea)', flexShrink: 0, border: '1px solid #e3f5ea', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 20 }}>
                          <MS style={{ fontSize: 40, color: '#5dbd8a' }}>favorite</MS>
                        </div>
                      </div>
                      <div style={{ fontSize: 13.5, color: '#3a3d44', lineHeight: 1.6, marginTop: 20 }}>{he ? 'KidsIt הוא עוזר הורות חכם המספק עצות מותאמות אישית, מענה לשאלות בזמן אמת וכלים יומיומיים להורים. מובנה כקיצור דרך חיצוני באפליקציה העירונית.' : 'KidsIt is a smart parenting assistant offering personalized advice, real-time answers and everyday tools for parents. Linked as an external shortcut from the city app.'}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION SHEET */}
              <div onClick={this.closeSheet} style={{
                position: 'absolute', inset: 0, zIndex: 50,
                background: 'rgba(10,12,20,.4)',
                opacity: sheet.open ? 1 : 0,
                transition: 'opacity .26s ease',
                pointerEvents: sheet.open ? 'auto' : 'none',
              }} />
              <div style={{
                position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 51,
                transform: `translateY(${sheet.open ? '0%' : '130%'})`,
                transition: 'transform .32s cubic-bezier(.32,.72,0,1)',
                pointerEvents: sheet.open ? 'auto' : 'none',
              }}>
                <div style={{
                  background: 'rgba(250,250,252,.96)',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: 20, overflow: 'hidden', marginBottom: 8,
                }}>
                  <div style={{ padding: '20px 18px 16px', textAlign: 'center', borderBottom: '1px solid #e6e6ea' }}>
                    <div style={{ width: 58, height: 58, borderRadius: 16, background: sheetIconBg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 11 }}>
                      <MS style={{ fontSize: 31, color: sheetIconColor }}>{sheetIcon}</MS>
                    </div>
                    <div style={{ fontSize: 16.5, fontWeight: 700, color: '#1c1c1e' }}>{sheetTitle}</div>
                    <div style={{ fontSize: 13.5, color: '#86868b', marginTop: 3, fontFamily: 'ui-monospace,monospace' }}>{sheetSub}</div>
                  </div>
                  <div onClick={this.confirmSheet} style={{ padding: 16, textAlign: 'center', fontSize: 17, fontWeight: 600, color: '#0a84ff', cursor: 'pointer' }}>{sheetBtn}</div>
                </div>
                <div onClick={this.closeSheet} style={{
                  background: 'rgba(255,255,255,.96)',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: 18, padding: 16, textAlign: 'center',
                  fontSize: 17, fontWeight: 700, color: '#0a84ff', cursor: 'pointer',
                }}>{cancelLabel}</div>
              </div>

              {/* TOAST */}
              <div style={{
                position: 'absolute', left: '50%', bottom: 46, zIndex: 80,
                transform: `translateX(-50%) translateY(${s.toast.show ? '0px' : '14px'})`,
                opacity: s.toast.show ? 1 : 0,
                transition: 'all .3s ease', pointerEvents: 'none',
              }}>
                <div style={{
                  background: 'rgba(20,22,30,.92)', backdropFilter: 'blur(10px)',
                  color: '#fff', padding: '12px 20px', borderRadius: 24,
                  fontSize: 14, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 9,
                  boxShadow: '0 8px 24px rgba(0,0,0,.3)', whiteSpace: 'nowrap',
                }}>
                  <MS style={{ fontSize: 19, color: accent }}>{s.toast.icon}</MS>{s.toast.text}
                </div>
              </div>

              {/* SPLASH */}
              <div style={{
                position: 'absolute', inset: 0, zIndex: 90, background: headerBg,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 22, opacity: s.booting ? 1 : 0,
                transition: 'opacity .5s ease',
                pointerEvents: s.booting ? 'auto' : 'none',
              }}>
                <img src="./logo.png" alt="" style={{
                  width: 168, height: 168, borderRadius: 38,
                  boxShadow: '0 14px 36px rgba(0,0,0,.28)',
                  animation: 'fadeUp .5s ease',
                }} />
                <div style={{ textAlign: 'center', color: '#fff' }}>
                  <div style={{ fontSize: 13, opacity: .85 }}>{mSub}</div>
                  <div style={{ fontSize: 25, fontWeight: 700 }}>{mName}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,.9)', marginTop: 6 }}>
                  <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                  <span style={{ fontSize: 13.5 }}>{bootText}</span>
                </div>
              </div>

      </div>
    );
  }
}
