# Maintainer: Terromur <terromuroz@proton.me>
# Maintainer: Fazri Gading <fazrigading@gmail.com>
pkgname=Hytale-F2P-git
_pkgname=Battly
pkgver=2.0.2b.r120.gb05aeef
pkgrel=1
pkgdesc="Battly Launcher - unofficial Hytale Launcher for free to play with multiplayer support"
arch=('x86_64')
url="https://www.battly.site"
license=('custom')
makedepends=('npm' 'git' 'rpm-tools' 'libxcrypt-compat')
source=("git+$url.git" "Hytale-F2P.desktop")
sha256sums=('SKIP' '8c78a6931fade2b0501122980dc238e042b9f6f0292b5ca74c391d7b3c1543c0')

pkgver() {
  cd "$_pkgname"
  printf "2.0.2b.r%s.g%s" "$(git rev-list --count HEAD)" "$(git rev-parse --short HEAD)"
}

build() {
   cd "$_pkgname"
   npm install
   npm run build:linux
}

package() {
  mkdir -p "$pkgdir/opt/$_pkgname"
  cp -r "$_pkgname/dist/linux-unpacked/"* "$pkgdir/opt/$_pkgname"
  install -Dm644 "$_pkgname.desktop" "$pkgdir/usr/share/applications/$_pkgname.desktop"
  install -Dm644 "$_pkgname/icon.png" "$pkgdir/usr/share/icons/hicolor/512x512/apps/$_pkgname.png"
}
