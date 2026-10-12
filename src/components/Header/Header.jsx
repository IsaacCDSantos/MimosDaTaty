import './Header.css'
function Header() {
  return (
    <header>
      <div className="header-content">
        <img src="src\assets\images\Gemini_Generated_Image_-removebg-preview.png" alt="" />
        <nav>
          <ul>
            <li><a href="">Home</a></li>
            <li><a href="">Catálogo</a></li>
            <li><a href="">Sobre</a></li>
            <li><a href="">Contato</a></li>
          </ul>
        </nav>

        <div className='header-actions'>
          <a href=""><svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 11.25C13.7949 11.25 15.25 9.79493 15.25 8C15.25 6.20507 13.7949 4.75 12 4.75C10.2051 4.75 8.75 6.20507 8.75 8C8.75 9.79493 10.2051 11.25 12 11.25Z" stroke="#875E4B" strokeWidth="1.8" />
            <path d="M5.5 19C5.9 15.8 8.35 13.5 12 13.5C15.65 13.5 18.1 15.8 18.5 19" stroke="#875E4B" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#875E4B" strokeWidth="1.5" />
          </svg>Login</a>
          <a href=""><svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <g clipPath="url(#clip0_59_13)">
              <path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38754 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6M10 21C10 21.5523 9.55228 22 9 22C8.44772 22 8 21.5523 8 21C8 20.4477 8.44772 20 9 20C9.55228 20 10 20.4477 10 21ZM21 21C21 21.5523 20.5523 22 20 22C19.4477 22 19 21.5523 19 21C19 20.4477 19.4477 20 20 20C20.5523 20 21 20.4477 21 21Z" stroke="#97644E" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <defs>
              <clipPath id="clip0_59_13">
                <rect width="24" height="24" fill="white" />
              </clipPath>
            </defs>
          </svg> R$0,00</a>
        </div>
      </div>

      {/* Detalhe de bordado / bico de crochê com pesponto */}
      <div className="crochet-border" aria-hidden="true">
        <svg width="100%" height="28" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="crochet-pattern" x="0" y="0" width="36" height="28" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="36" height="10" fill="#CF8487" />
              <circle cx="18" cy="10" r="18" fill="#CF8487" />
            </pattern>
          </defs>
          <rect width="100%" height="28" fill="url(#crochet-pattern)" />
        </svg>
      </div>
    </header>
  )
}
export default Header;