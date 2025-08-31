## QFX Bank Statement Downloader

currently supporting

- Bank of America (trigger button per account)
- Wells Fargo (auto download once entering download page)
- Chase (trigger button on home page, downloads all accounts)
- Amex (trigger button per account, 80 day limit due to SB amex-IT systems)
- Discover (csv only, single account only since I don't have 2 cards, downloads past 12 months)
- Wise (csv only, slightly broken due to one-time-token auth)
- Venmo (csv only)
- Sofi (csv only, 2 months back due to SB sofi-IT systems)
- Fidelity (csv only, button on activities/orders page due to the need to grab/replay graphQL query)
- Amazon (last 3mo synthetic qfx)

## Disclaimer

This project is provided solely for debugging, testing, and educational purposes.

It is not intended for production use, commercial distribution, or use with any account, system, or service that is not personally owned or explicitly authorized by you.

The author(s) make no warranties of any kind, express or implied, and assume no liability for any misuse of this code.

By using this project, you agree to take full responsibility for your actions and to comply with all applicable laws, terms of service, and regulations.

## Dev notes

- `bun serve-dist`
- `bun build-discover-watch`
- `git push --tags && git push`
