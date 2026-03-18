import FoodSnapScan from "../components/FoodSnapScan";
import FoodSnapLogSection from "../components/FoodSnapLogSection";
import FoodSnapNutridexSection from "../components/FoodSnapNutridexSection";
import FoodSnapStatsSection from "../components/FoodSnapStatsSection";
import FoodSnapDiarySection from "../components/FoodSnapDiarySection";
import HeroStatsStrip from "../components/HeroStatsStrip";
import BrandLogo from "../components/BrandLogo";

export default function Page() {
  return (
    <>
      <nav>
        <a className="logo" href="#top">
          <BrandLogo size="nav" />
        </a>
        <div className="nav-links">
          <a className="nl" href="#scan">Scan</a>
          <a className="nl" href="#log">Log</a>
          <a className="nl" href="#nutridex">Nutridex</a>
          <a className="nl" href="#stats">Stats</a>
          <a className="nl" href="#diary">Diary</a>
          <a className="nl" href="#features">Features</a>
        </div>
        <a className="nav-cta" href="#scan">{"\u{1F4F7}"} Try Lishe AI</a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-bg"></div>
        <div className="floaters">
          <span className="fl-item">{"\u{1F34E}"}</span>
          <span className="fl-item">{"\u{1F35C}"}</span>
          <span className="fl-item">{"\u{1F96D}"}</span>
          <span className="fl-item">{"\u{1F349}"}</span>
          <span className="fl-item">{"\u{1F95D}"}</span>
          <span className="fl-item">{"\u{1F351}"}</span>
          <span className="fl-item">{"\u{1F34D}"}</span>
          <span className="fl-item">{"\u{1F353}"}</span>
        </div>

        <div className="hero-content">
          <div className="hero-badge">AI Food Intelligence</div>
          <h1 className="hero-title">
            Track your whole <em>food intake</em> instantly.
          </h1>
          <p className="hero-sub">
            Lishe AI combines on-device AI with nutrition data so you can identify foods, log meals,
            and build your Nutridex without friction.
          </p>
          <div className="hero-actions">
            <a href="#scan" className="btn-primary">
              {"\u{1F4F7}"} Scan a food
            </a>
            <a href="#features" className="btn-outline">
              Explore features
            </a>
          </div>
          <HeroStatsStrip />
        </div>
      </section>

      <FoodSnapScan />
      <FoodSnapLogSection />
      <FoodSnapNutridexSection />
      <FoodSnapStatsSection />
      <FoodSnapDiarySection />

      <section className="features-section" id="features">
        <div className="section-inner">
          <div className="tag">All Features</div>
          <h2 className="sh">
            Everything you need to <br />
            <em>understand your food</em>
          </h2>
          <p className="sp">
            Built for people who take nutrition seriously — without making it feel like a chore.
          </p>
          <div className="features-grid">
            <div className="feat">
              <div className="feat-icon fi-g">{"\u{1F4F7}"}</div>
              <div className="feat-title">FoodVision AI — 100 foods</div>
              <div className="feat-desc">
                Snap any food and get instant identification with full nutritional breakdown.
              </div>
            </div>
            <div className="feat">
              <div className="feat-icon fi-o">{"\u{1F4CB}"}</div>
              <div className="feat-title">Track Your Whole Food Intake</div>
              <div className="feat-desc">
                Keep a detailed log of every whole food you consume daily. Real-time progress
                against your calorie and macro targets.
              </div>
            </div>
            <div className="feat">
              <div className="feat-icon fi-y">{"\u{1F4A1}"}</div>
              <div className="feat-title">Nutrition Insights</div>
              <div className="feat-desc">
                Go beyond macros — vitamins, minerals, fibre, and food context for every item.
              </div>
            </div>
            <div className="feat">
              <div className="feat-icon fi-g">{"\u{1F4D6}"}</div>
              <div className="feat-title">Complete the Nutridex</div>
              <div className="feat-desc">
                Collect beautifully illustrated food icons as you explore. A pokedex for nutrition.
              </div>
            </div>
            <div className="feat">
              <div className="feat-icon fi-b">{"\u{1F5BC}"}</div>
              <div className="feat-title">Visual Food Diary</div>
              <div className="feat-desc">
                Every meal saved with its real photo. Build a beautiful visual log to reflect on
                your food journey.
              </div>
            </div>
            <div className="feat">
              <div className="feat-icon fi-p">{"\u2197"}</div>
              <div className="feat-title">Share Your Meals</div>
              <div className="feat-desc">
                Export meals with Lishe AI overlays. Share to any platform with one tap.
              </div>
            </div>
            <div className="feat">
              <div className="feat-icon fi-b">{"\u{1F9E0}"}</div>
              <div className="feat-title">Multi-Food Mode</div>
              <div className="feat-desc">
                Identify visible foods and drinks from one image, with estimated servings and
                weights for the full plate.
              </div>
            </div>
            <div className="feat">
              <div className="feat-icon fi-g">{"\u{1F3AF}"}</div>
              <div className="feat-title">Set Calorie & Macro Goals</div>
              <div className="feat-desc">
                Define custom calorie and macronutrient targets. Track your daily streaks and stay
                consistent.
              </div>
            </div>
            <div className="feat">
              <div className="feat-icon fi-o">{"\u{1F4C8}"}</div>
              <div className="feat-title">Food Trends & Stats</div>
              <div className="feat-desc">
                Monitor eating habits over time — top foods, favourite meals by time of day, and
                weekly nutrition trends.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-inner">
          <div className="cta-bg"></div>
          <div className="cta-floats">
            <span className="cf cf1">{"\u{1F34E}"}</span>
            <span className="cf cf2">{"\u{1F966}"}</span>
            <span className="cf cf3">{"\u{1F34A}"}</span>
            <span className="cf cf4">{"\u{1F951}"}</span>
          </div>
          <h2 className="cta-title">Start snapping. Start knowing.</h2>
          <p className="cta-sub">
            Your camera is the only tool you need to understand your nutrition. No account required
            to get started.
          </p>
          <a href="#scan" className="btn-white">{"\u{1F4F7}"} Try Lishe AI Free</a>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="footer-left">
            <a href="#" className="footer-logo">
              <BrandLogo size="footer" />
            </a>
            <div className="footer-copy">© 2026 Lishe AI. AI-powered food intelligence.</div>
          </div>
          <div className="footer-links">
            <a href="#" className="flink">Privacy</a>
            <a href="#" className="flink">Terms</a>
            <a href="#" className="flink">Contact</a>
            <a href="#" className="flink">API Docs</a>
          </div>
        </div>
      </footer>
    </>
  );
}
