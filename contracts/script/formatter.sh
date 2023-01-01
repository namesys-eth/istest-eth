echo "You need 'npm' and 'foundry' to continue..."
echo "Formatting solidity code with prettier..."
npm install --silent --save-dev prettier prettier-plugin-solidity
npx prettier --write 'src/*.sol'
npx prettier --write 'test/*.sol'
npx prettier --write 'script/*.sol'
