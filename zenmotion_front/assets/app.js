/* ================================================================
   ZenMotion — shared front-end app  (assets/app.js)
   - Injects shared header / footer / cart drawer / toast on every page
   - In-browser cart (localStorage with in-memory fallback)
   - Wires add-to-cart, qty steppers, FAQ, mobile menu, checkout
   - All backend / Airwallex integration points are marked clearly.

   NOTE: This is a static front end. Cart state lives in the browser
   so the prototype works without a server. Your Cursor backend should
   move pricing + cart + orders server-side (never trust client prices).
   ================================================================ */
(function () {
  "use strict";

  /* ----------------------------- config ----------------------------- */
  var CONFIG = {
    currency: "USD",
    checkoutEndpoint: "/api/checkout", // implement in backend (creates Airwallex payment)
    contactEndpoint: "/api/contact",
    supportEmail: "support@zenmotionpeace.com",
    supportPhone: "+852 5587 1500"
  };

  /* --------------------------- product data --------------------------
     Prices are in minor units (cents). Mirror this in your backend and
     treat the SERVER copy as the source of truth at checkout. */
  var PRODUCTS = {
    course: { id:"course", name:"Tai Chi Beginner Video Course", short:"Course",
      price:2900, type:"digital", url:"course.html", img:"assets/img/lesson.jpg",
      blurb:"A beginner-friendly video course. 15 minutes a day of gentle, low-impact movement." },
    tshirt: { id:"tshirt", name:"ZenMotion Breathable Practice T-Shirt", short:"T-Shirt",
      price:7900, type:"physical", url:"product-tshirt.html", img:"assets/img/tshirt.jpg",
      blurb:"Soft, breathable shirt designed for easy movement during practice.",
      options:{ Size:["S","M","L","XL","2XL"] } },
    mat: { id:"mat", name:"ZenMotion Joint-Support Anti-slip Mat", short:"Mat",
      price:9900, type:"physical", url:"product-mat.html", img:"assets/img/mat.jpg",
      blurb:"Extra-cushioned, non-slip mat to support joints during floor and standing work." }
  };

  function money(minor){
    var v = (minor/100);
    return "$" + (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
  }

  /* ------------------------------ storage ---------------------------- */
  var MEM = {};
  var store = {
    get:function(k){ try{ return localStorage.getItem(k); }catch(e){ return MEM[k]||null; } },
    set:function(k,v){ try{ localStorage.setItem(k,v); }catch(e){ MEM[k]=v; } }
  };

  /* ------------------------------- cart ------------------------------ */
  var CART_KEY = "zm_cart_v1";
  function loadCart(){ try{ return JSON.parse(store.get(CART_KEY)) || []; }catch(e){ return []; } }
  function saveCart(c){ store.set(CART_KEY, JSON.stringify(c)); }
  function lineKey(id, opts){ return id + (opts && Object.keys(opts).length ? ":"+JSON.stringify(opts) : ""); }

  function addItem(id, opts, qty){
    var p = PRODUCTS[id]; if(!p) return;
    qty = Math.max(1, qty||1);
    var cart = loadCart(); var key = lineKey(id, opts);
    var found = cart.filter(function(i){ return i.key===key; })[0];
    if(found){ found.qty += qty; } else { cart.push({ key:key, id:id, opts:opts||{}, qty:qty }); }
    saveCart(cart); renderAll();
  }
  function setQty(key, qty){
    var cart = loadCart();
    cart = cart.map(function(i){ if(i.key===key) i.qty = qty; return i; }).filter(function(i){ return i.qty>0; });
    saveCart(cart); renderAll();
  }
  function removeItem(key){ saveCart(loadCart().filter(function(i){ return i.key!==key; })); renderAll(); }
  function cartCount(){ return loadCart().reduce(function(n,i){ return n+i.qty; },0); }
  function cartSubtotal(){ return loadCart().reduce(function(s,i){ return s + (PRODUCTS[i.id]?PRODUCTS[i.id].price:0)*i.qty; },0); }
  function cartHasPhysical(){ return loadCart().some(function(i){ return PRODUCTS[i.id] && PRODUCTS[i.id].type==="physical"; }); }
  function optLine(opts){ return Object.keys(opts||{}).map(function(k){ return k+": "+opts[k]; }).join(" · "); }

  /* ------------------------- chrome: header ------------------------- */
  var NAV = [
    {label:"Shop", href:"shop.html", page:"shop"},
    {label:"The Course", href:"course.html", page:"course"},
    {label:"About", href:"about.html", page:"about"},
    {label:"Contact", href:"contact.html", page:"contact"},
    {label:"FAQ", href:"faq.html", page:"faq"}
  ];
  var leafLogo = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3c2.5 3 2.5 6 0 9s-2.5 6 0 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" opacity=".5"/></svg>';

  function headerHTML(active){
    var links = NAV.map(function(n){
      return '<a href="'+n.href+'" data-nav="'+n.page+'"'+(n.page===active?' class="active"':'')+'>'+n.label+'</a>';
    }).join("");
    var mlinks = '<a href="index.html">Home</a>' + NAV.map(function(n){ return '<a href="'+n.href+'">'+n.label+'</a>'; }).join("");
    return ''
      + '<header class="site"><div class="container"><div class="nav">'
      +   '<a class="brand" href="index.html" aria-label="ZenMotion home"><span class="mark" aria-hidden="true">'+leafLogo+'</span>ZenMotion</a>'
      +   '<nav class="nav-links" aria-label="Primary">'+links+'</nav>'
      +   '<div class="nav-cta">'
      +     '<a class="btn btn-primary btn-sm hide-sm" href="course.html">Get the course</a>'
      +     '<button class="icon-btn" id="cartBtn" aria-label="Open cart">'
      +       '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 7h13l-1.2 9.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 7a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="2"/></svg>'
      +       '<span class="cart-badge" id="cartBadge">0</span>'
      +     '</button>'
      +     '<button class="icon-btn menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false">'
      +       '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      +     '</button>'
      +   '</div>'
      + '</div></div>'
      + '<div class="mobile-menu" id="mobileMenu">'+mlinks+'<a href="cart.html">Cart</a></div>'
      + '</header>';
  }

  /* ------------------------- chrome: footer ------------------------- */
  function footerHTML(){
    return ''
      + '<footer class="site"><div class="container">'
      + '<div class="foot-grid">'
      +   '<div class="foot-brand">'
      +     '<a class="brand" href="index.html"><span class="mark" aria-hidden="true">'+leafLogo+'</span>ZenMotion</a>'
      +     '<p>Grova Technology (HK) Limited<br>Room A5, 7/F, Astoria Building,<br>No. 34 Ashley Road, Tsim Sha Tsui, Hong Kong<br>'+CONFIG.supportEmail+' · '+CONFIG.supportPhone+'</p>'
      +     '<div class="descriptor">Your card statement will show <b>ZENMOTION</b> (Grova Technology HK Limited).</div>'
      +     '<div class="pay-marks" aria-label="Accepted payment methods"><span>VISA</span><span>Mastercard</span><span>Amex</span><span>Apple&nbsp;Pay</span><span>PayPal</span></div>'
      +   '</div>'
      +   '<div><h4>Explore</h4><ul>'
      +     '<li><a href="shop.html">Shop all</a></li>'
      +     '<li><a href="course.html">The course</a></li>'
      +     '<li><a href="course.html#how">How it works</a></li>'
      +     '<li><a href="course.html#lesson">Free lesson</a></li>'
      +     '<li><a href="faq.html">FAQ</a></li>'
      +   '</ul></div>'
      +   '<div><h4>Company &amp; policies</h4><ul>'
      +     '<li><a href="about.html">About us</a></li>'
      +     '<li><a href="contact.html">Contact</a></li>'
      +     '<li><a href="refund-policy.html">Refund policy</a></li>'
      +     '<li><a href="shipping-policy.html">Shipping policy</a></li>'
      +     '<li><a href="privacy-policy.html">Privacy policy</a></li>'
      +     '<li><a href="terms-of-service.html">Terms of service</a></li>'
      +     '<li><a href="medical-disclaimer.html">Medical disclaimer</a></li>'
      +   '</ul></div>'
      + '</div>'
      + '<div class="foot-bottom"><span>© <span id="year"></span> Grova Technology (HK) Limited. All rights reserved.</span><span>Made for gentle, everyday movement.</span></div>'
      + '</div></footer>';
  }

  /* --------------------- chrome: drawer + toast --------------------- */
  function drawerHTML(){
    return ''
      + '<div class="drawer-root" id="drawerRoot" role="dialog" aria-modal="true" aria-label="Cart">'
      + '<div class="drawer-backdrop" data-drawer-close></div>'
      + '<aside class="drawer">'
      +   '<div class="drawer-head"><h3>Your cart</h3><button class="x" data-drawer-close aria-label="Close cart"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>'
      +   '<div class="drawer-items" id="drawerItems"></div>'
      +   '<div class="drawer-foot" id="drawerFoot"></div>'
      + '</aside></div>';
  }

  /* ------------------------------ inject ----------------------------- */
  var page = document.body.getAttribute("data-page") || "";
  document.body.insertAdjacentHTML("afterbegin", headerHTML(page));
  document.body.insertAdjacentHTML("beforeend", footerHTML());
  document.body.insertAdjacentHTML("beforeend", drawerHTML());
  document.body.insertAdjacentHTML("beforeend", '<div class="toast-root" id="toastRoot"></div>');
  var yEl = document.getElementById("year"); if(yEl) yEl.textContent = new Date().getFullYear();

  /* ----------------------------- toast ------------------------------- */
  function toast(msg, withCartLink){
    var root = document.getElementById("toastRoot");
    var el = document.createElement("div"); el.className = "toast";
    el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>'+msg+(withCartLink?' · <a href="cart.html">View cart</a>':'')+'</span>';
    root.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add("show"); });
    setTimeout(function(){ el.classList.remove("show"); setTimeout(function(){ el.remove(); }, 300); }, 3200);
  }

  /* --------------------------- drawer logic -------------------------- */
  var drawerRoot = document.getElementById("drawerRoot");
  function openDrawer(){ renderDrawer(); drawerRoot.classList.add("open"); document.body.style.overflow="hidden"; }
  function closeDrawer(){ drawerRoot.classList.remove("open"); document.body.style.overflow=""; }
  drawerRoot.querySelectorAll("[data-drawer-close]").forEach(function(b){ b.addEventListener("click", closeDrawer); });
  document.addEventListener("keydown", function(e){ if(e.key==="Escape" && drawerRoot.classList.contains("open")) closeDrawer(); });

  function thumbStyle(p){ return p.img ? ' style="background-image:url(\''+p.img+'\');background-size:cover;background-position:center;color:transparent"' : ''; }

  function lineHTML(i){
    var p = PRODUCTS[i.id]; if(!p) return "";
    return '<div class="line">'
      + '<div class="lthumb"'+thumbStyle(p)+'>'+p.short+'</div>'
      + '<div class="lmid"><b>'+p.name+'</b>'
      +   (optLine(i.opts)?'<div class="opt-line">'+optLine(i.opts)+'</div>':'')
      +   '<div class="lqty"><button data-dec="'+i.key+'" aria-label="Decrease">−</button><span>'+i.qty+'</span><button data-inc="'+i.key+'" aria-label="Increase">+</button></div>'
      + '</div>'
      + '<div class="lright"><span class="lprice">'+money(p.price*i.qty)+'</span><button class="lremove" data-remove="'+i.key+'">Remove</button></div>'
      + '</div>';
  }

  function renderDrawer(){
    var items = loadCart(); var box = document.getElementById("drawerItems"); var foot = document.getElementById("drawerFoot");
    if(!items.length){
      box.innerHTML = '<div class="cart-empty"><svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M6 7h13l-1.2 9.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Z" stroke="currentColor" stroke-width="2"/></svg><p>Your cart is empty.</p><a class="btn btn-ghost btn-sm" href="shop.html">Browse the shop</a></div>';
      foot.innerHTML = "";
      return;
    }
    box.innerHTML = items.map(lineHTML).join("");
    foot.innerHTML = '<div class="subtotal-row"><span>Subtotal</span><span class="amt">'+money(cartSubtotal())+'</span></div>'
      + '<p class="small muted" style="margin:.2rem 0 .8rem">'+(cartHasPhysical()?'Shipping calculated at checkout.':'Digital delivery — nothing to ship.')+' Taxes where applicable.</p>'
      + '<a class="btn btn-primary btn-block btn-lg" href="checkout.html">Checkout · '+money(cartSubtotal())+'</a>'
      + '<a class="btn btn-ghost btn-block" href="cart.html" style="margin-top:8px">View full cart</a>'
      + '<div class="secure-line"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg>Secure checkout · 90-day guarantee</div>';
    box.querySelectorAll("[data-dec]").forEach(function(b){ b.onclick=function(){ var k=b.getAttribute("data-dec"); var it=loadCart().filter(function(x){return x.key===k;})[0]; if(it) setQty(k, it.qty-1); }; });
    box.querySelectorAll("[data-inc]").forEach(function(b){ b.onclick=function(){ var k=b.getAttribute("data-inc"); var it=loadCart().filter(function(x){return x.key===k;})[0]; if(it) setQty(k, it.qty+1); }; });
    box.querySelectorAll("[data-remove]").forEach(function(b){ b.onclick=function(){ removeItem(b.getAttribute("data-remove")); }; });
  }

  /* ------------------------- render: badge --------------------------- */
  function renderBadge(){
    var b = document.getElementById("cartBadge"); if(!b) return;
    var n = cartCount(); b.textContent = n; b.classList.toggle("show", n>0);
  }

  /* ----------------------- render: cart page ------------------------- */
  function renderCartPage(){
    var rows = document.getElementById("cartRows"); if(!rows) return;
    var summary = document.getElementById("cartSummary");
    var items = loadCart();
    var empty = document.getElementById("cartEmpty");
    var layout = document.getElementById("cartLayout");
    if(!items.length){ if(empty) empty.style.display="block"; if(layout) layout.style.display="none"; return; }
    if(empty) empty.style.display="none"; if(layout) layout.style.display="grid";
    rows.innerHTML = items.map(function(i){
      var p = PRODUCTS[i.id];
      return '<div class="crow"><div class="cthumb"'+thumbStyle(p)+'>'+p.short+'</div>'
        + '<div><h3>'+p.name+'</h3>'+(optLine(i.opts)?'<div class="small muted">'+optLine(i.opts)+'</div>':'')
        +   '<div class="qty" style="margin-top:10px"><button data-dec="'+i.key+'" aria-label="Decrease">−</button><input data-qtyfield="'+i.key+'" value="'+i.qty+'" inputmode="numeric" aria-label="Quantity"><button data-inc="'+i.key+'" aria-label="Increase">+</button></div>'
        +   ' <button class="lremove" data-remove="'+i.key+'" style="margin-left:10px">Remove</button>'
        + '</div>'
        + '<div class="cright"><div class="lprice">'+money(p.price*i.qty)+'</div></div></div>';
    }).join("");
    summary.innerHTML = '<h3 style="margin-bottom:14px">Order summary</h3>'
      + '<div class="line2"><span>Subtotal</span><span>'+money(cartSubtotal())+'</span></div>'
      + '<div class="line2"><span>Shipping</span><span>'+(cartHasPhysical()?'Calculated at checkout':'Free · digital')+'</span></div>'
      + '<div class="total"><span>Total</span><span class="amt">'+money(cartSubtotal())+'</span></div>'
      + '<a class="btn btn-primary btn-block btn-lg" href="checkout.html" style="margin-top:16px">Proceed to checkout</a>'
      + '<div class="secure-line"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg>Billed as ZENMOTION · 90-day guarantee</div>';
    rows.querySelectorAll("[data-dec]").forEach(function(b){ b.onclick=function(){ var k=b.getAttribute("data-dec"); var it=loadCart().filter(function(x){return x.key===k;})[0]; if(it) setQty(k, it.qty-1); }; });
    rows.querySelectorAll("[data-inc]").forEach(function(b){ b.onclick=function(){ var k=b.getAttribute("data-inc"); var it=loadCart().filter(function(x){return x.key===k;})[0]; if(it) setQty(k, it.qty+1); }; });
    rows.querySelectorAll("[data-remove]").forEach(function(b){ b.onclick=function(){ removeItem(b.getAttribute("data-remove")); }; });
    rows.querySelectorAll("[data-qtyfield]").forEach(function(inp){ inp.onchange=function(){ var n=parseInt(inp.value,10); setQty(inp.getAttribute("data-qtyfield"), isNaN(n)?1:Math.max(0,n)); }; });
  }

  /* --------------------- render: checkout page ----------------------- */
  function renderCheckout(){
    var sum = document.getElementById("checkoutSummary"); if(!sum) return;
    var items = loadCart();
    var shipping = document.getElementById("shippingSection");
    if(!items.length){
      sum.innerHTML = '<p class="muted">Your cart is empty.</p><a class="btn btn-ghost btn-block" href="shop.html">Browse the shop</a>';
      var payWrap = document.getElementById("paySection"); if(payWrap) payWrap.style.display="none";
      if(shipping) shipping.style.display="none";
      return;
    }
    if(shipping) shipping.style.display = cartHasPhysical() ? "block" : "none";
    sum.innerHTML = items.map(function(i){
      var p = PRODUCTS[i.id];
      return '<div class="line"><div class="lthumb"'+thumbStyle(p)+'>'+p.short+'</div><div class="lmid"><b>'+p.name+'</b>'
        + (optLine(i.opts)?'<div class="opt-line">'+optLine(i.opts)+'</div>':'')
        + '<div class="small muted">Qty '+i.qty+'</div></div><div class="lright"><span class="lprice">'+money(p.price*i.qty)+'</span></div></div>';
    }).join("")
      + '<div class="line2" style="display:flex;justify-content:space-between;margin-top:14px"><span class="muted">Subtotal</span><span>'+money(cartSubtotal())+'</span></div>'
      + '<div class="line2" style="display:flex;justify-content:space-between;margin:8px 0"><span class="muted">Shipping</span><span>'+(cartHasPhysical()?'Free':'Digital — none')+'</span></div>'
      + '<div class="total" style="display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid var(--line);padding-top:14px"><b>Total</b><span class="amt" style="font-family:var(--serif);font-size:1.6rem;font-weight:600">'+money(cartSubtotal())+'</span></div>';
  }

  /* ----------------------------- render all -------------------------- */
  function renderAll(){ renderBadge(); renderDrawer(); renderCartPage(); renderCheckout(); }

  /* --------------------------- global events ------------------------- */
  document.addEventListener("click", function(e){
    var t = e.target.closest("[data-add],[data-buy],[data-drawer-open]");
    if(!t) return;
    // open drawer button
    if(t.hasAttribute("data-drawer-open")){ e.preventDefault(); openDrawer(); return; }
    var id = t.getAttribute("data-add") || t.getAttribute("data-buy");
    if(!id || !PRODUCTS[id]) return;
    e.preventDefault();
    // collect options + qty from nearest [data-product] scope, if present
    var scope = t.closest("[data-product]") || document;
    var opts = {};
    scope.querySelectorAll(".size-pills").forEach(function(grp){
      var name = grp.getAttribute("data-opt") || "Size";
      var active = grp.querySelector(".size-pill.active");
      if(active) opts[name] = active.textContent.trim();
    });
    var qf = scope.querySelector("[data-qty-input]");
    var qty = qf ? Math.max(1, parseInt(qf.value,10)||1) : 1;
    addItem(id, opts, qty);
    if(t.hasAttribute("data-buy")){ window.location.href = "checkout.html"; return; }
    toast(PRODUCTS[id].name + " added", true);
    openDrawer();
  });

  // cart button
  var cartBtn = document.getElementById("cartBtn");
  if(cartBtn) cartBtn.addEventListener("click", openDrawer);

  // mobile menu
  var menuBtn = document.getElementById("menuBtn"), mobileMenu = document.getElementById("mobileMenu");
  if(menuBtn) menuBtn.addEventListener("click", function(){
    var open = mobileMenu.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });

  // FAQ accordion (any page)
  document.querySelectorAll(".qa > button").forEach(function(btn){
    btn.addEventListener("click", function(){
      var qa = btn.parentElement, ans = qa.querySelector(".ans");
      var open = qa.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      ans.style.maxHeight = open ? ans.scrollHeight+"px" : null;
    });
  });

  // PDP qty steppers
  document.querySelectorAll(".qty").forEach(function(q){
    var input = q.querySelector("[data-qty-input]"); if(!input) return;
    var dec = q.querySelector("[data-qty-dec]"), inc = q.querySelector("[data-qty-inc]");
    if(dec) dec.addEventListener("click", function(){ input.value = Math.max(1,(parseInt(input.value,10)||1)-1); });
    if(inc) inc.addEventListener("click", function(){ input.value = (parseInt(input.value,10)||1)+1; });
  });

  // size pills
  document.querySelectorAll(".size-pills").forEach(function(grp){
    grp.querySelectorAll(".size-pill").forEach(function(p){
      p.addEventListener("click", function(){
        grp.querySelectorAll(".size-pill").forEach(function(x){ x.classList.remove("active"); });
        p.classList.add("active");
      });
    });
  });

  // free lesson placeholders
  document.querySelectorAll("[data-free-lesson]").forEach(function(el){
    var play = function(){ toast("Free lesson player goes here — embed a real hosted video."); };
    el.addEventListener("click", play);
    el.addEventListener("keydown", function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); play(); } });
  });

  /* =========================== MOTION ===============================
     Progressive-enhancement animations. We only opt in when the user
     has NOT requested reduced motion; otherwise the page stays static
     and fully visible (the CSS keeps everything visible without .zm-anim). */
  function setupMotion(){
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // header gains a soft shadow once the page is scrolled
    var header = document.querySelector("header.site");
    if(header){
      var onScroll = function(){ header.classList.toggle("scrolled", window.scrollY > 8); };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive:true });
    }

    if(reduce || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("zm-anim");

    var selector = ".card,.step,.review,.product-card,.qa,.guarantee,.instructor,"
      + ".media-card,.lesson,.price-card,.disclaimer,.spec-list,.includes li,"
      + ".trust-strip .chip,.about-figure,section > .container > .center";
    var els = [].slice.call(document.querySelectorAll(selector));

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin:"0px 0px -8% 0px", threshold:0.08 });

    els.forEach(function(el){
      // skip anything already in the first viewport so it doesn't flash in
      if(el.getBoundingClientRect().top < window.innerHeight * 0.9 && window.scrollY === 0){
        // gentle stagger among siblings that share a parent
        var sibs = [].slice.call(el.parentElement ? el.parentElement.children : []);
        var idx = Math.max(0, sibs.indexOf(el));
        el.style.transitionDelay = Math.min(idx, 5) * 70 + "ms";
      }
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  /* ===================== CHECKOUT INTEGRATION ========================
     >>> BACKEND INTEGRATION POINT — Airwallex / payment provider <<<
     The front end never handles card data. Your Cursor backend creates
     the payment server-side and returns a hosted URL or a client secret.

     Flow (Airwallex Hosted Payment Page / Payment Intent):
       1) POST CONFIG.checkoutEndpoint with { items, email, shipping }
          (server recomputes the price from PRODUCTS — never trust client)
       2) Server creates the Airwallex Payment Intent / Checkout session
          and returns { url } (hosted) OR { clientSecret }
       3) Redirect to url, or mount Airwallex's drop-in / Apple Pay element

     Apple Pay rides on top of CARD ACQUIRING. It only works once your
     Airwallex card-acquiring capability is APPROVED by their risk team.
     If acquiring isn't approved, no front-end change enables Apple Pay.
     =================================================================== */
  var coForm = document.getElementById("checkoutForm");
  if(coForm){
    var statusBox = document.getElementById("checkoutStatus");
    var statusText = document.getElementById("checkoutStatusText");
    var emailInput = document.getElementById("email");
    var emailField = document.getElementById("emailField");
    function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

    function pay(method){
      if(!emailInput || !validEmail(emailInput.value.trim())){
        if(emailField){ emailField.classList.add("invalid"); }
        if(emailInput) emailInput.focus();
        return;
      }
      if(emailField) emailField.classList.remove("invalid");
      startCheckout(method);
    }

    coForm.addEventListener("submit", function(e){ e.preventDefault(); pay("card"); });
    document.querySelectorAll("[data-pay]").forEach(function(b){ b.addEventListener("click", function(){ pay(b.getAttribute("data-pay")); }); });

    function startCheckout(method){
      if(statusBox) statusBox.classList.add("show");
      if(statusText) statusText.textContent = "Connecting to secure checkout…";

      // ---- DEMO ONLY: remove once the backend exists ----
      var DEMO = true;
      if(DEMO){
        setTimeout(function(){
          if(statusText) statusText.innerHTML = "✅ Front end ready. Connect <b>"+CONFIG.checkoutEndpoint+"</b> in your backend to take real payments (method: "+method+", total: "+money(cartSubtotal())+").";
        }, 900);
        return;
      }

      /* ---- REAL FLOW (uncomment when backend is ready) ----
      fetch(CONFIG.checkoutEndpoint, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ items: loadCart(), email: emailInput.value.trim(), method: method })
      })
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data.url){ window.location.href = data.url; return; }   // hosted checkout
        // else confirm data.clientSecret with Airwallex.js element here
      })
      .catch(function(){ if(statusText) statusText.textContent = "Something went wrong. Please try again."; });
      */
    }
  }

  /* ----------------------- contact form (demo) ----------------------- */
  var contactForm = document.getElementById("contactForm");
  if(contactForm){
    contactForm.addEventListener("submit", function(e){
      e.preventDefault();
      var ok = document.getElementById("contactStatus");
      // TODO: POST to CONFIG.contactEndpoint from your backend.
      if(ok){ ok.style.display="block"; ok.textContent = "Thanks — your message is ready to send. Connect "+CONFIG.contactEndpoint+" in the backend to deliver it."; }
      contactForm.reset();
    });
  }

  /* ------------------------- account tabs (demo) --------------------- */
  document.querySelectorAll(".auth-tabs button").forEach(function(b){
    b.addEventListener("click", function(){
      document.querySelectorAll(".auth-tabs button").forEach(function(x){ x.classList.remove("active"); });
      b.classList.add("active");
      var target = b.getAttribute("data-tab");
      document.querySelectorAll("[data-panel]").forEach(function(p){ p.style.display = p.getAttribute("data-panel")===target ? "block":"none"; });
    });
  });

  /* ------------------------------ init ------------------------------- */
  renderAll();
  setupMotion();

  // expose a tiny API for debugging / backend wiring
  window.ZenMotion = { PRODUCTS:PRODUCTS, addItem:addItem, loadCart:loadCart, money:money, CONFIG:CONFIG };
})();
