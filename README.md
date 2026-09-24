# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

deploy karne ke liye kaise kare
step 1. sabse pahle "git pull" kare
step 2. origin main se hi pull karna hai
step 3. jo bhi change karna hai kar lijiye
step 4. ab us changes ko git push and commit kar dijiye main branch par
step 5. deploy karne ke liye bas ek hi command chalao:
        "npm run deploy"
        (yeh automatically:
         1. package.json ka version bump karta hai (0.0.1 -> 0.0.2 -> ...)
         2. build banata hai (dist/version.json mein bhi version aa jata hai)
         3. gh-pages par publish kar deta hai)
step 6. deploy ke baad version bump ko commit karna na bhule:
        git add package.json
        git commit -m "chore: bump version to x.y.z"
step 7. ab check karo is link par 
        "https://github.com/cves2025/website/actions"

