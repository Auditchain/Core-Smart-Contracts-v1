pragma solidity =0.7.6;

// SPDX-License-Identifier: MIT



/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with GSN meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address payable) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes memory) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}

// SPDX-License-Identifier: MIT



/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// SPDX-License-Identifier: MIT



/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function tryAdd(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        uint256 c = a + b;
        if (c < a) return (false, 0);
        return (true, c);
    }

    /**
     * @dev Returns the substraction of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function trySub(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        if (b > a) return (false, 0);
        return (true, a - b);
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, with an overflow flag.
     *
     * _Available since v3.4._
     */
    function tryMul(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) return (true, 0);
        uint256 c = a * b;
        if (c / a != b) return (false, 0);
        return (true, c);
    }

    /**
     * @dev Returns the division of two unsigned integers, with a division by zero flag.
     *
     * _Available since v3.4._
     */
    function tryDiv(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        if (b == 0) return (false, 0);
        return (true, a / b);
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers, with a division by zero flag.
     *
     * _Available since v3.4._
     */
    function tryMod(uint256 a, uint256 b) internal pure returns (bool, uint256) {
        if (b == 0) return (false, 0);
        return (true, a % b);
    }

    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     *
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "SafeMath: subtraction overflow");
        return a - b;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     *
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers, reverting on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: division by zero");
        return a / b;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * reverting when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "SafeMath: modulo by zero");
        return a % b;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {trySub}.
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     *
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        return a - b;
    }

    /**
     * @dev Returns the integer division of two unsigned integers, reverting with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {tryDiv}.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        return a / b;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * reverting with custom message when dividing by zero.
     *
     * CAUTION: This function is deprecated because it requires allocating memory for the error
     * message unnecessarily. For custom revert reasons use {tryMod}.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     *
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        return a % b;
    }
}

// SPDX-License-Identifier: MIT







/**
 * @dev Implementation of the {IERC20} interface.
 *
 * This implementation is agnostic to the way tokens are created. This means
 * that a supply mechanism has to be added in a derived contract using {_mint}.
 * For a generic mechanism see {ERC20PresetMinterPauser}.
 *
 * TIP: For a detailed writeup see our guide
 * https://forum.zeppelin.solutions/t/how-to-implement-erc20-supply-mechanisms/226[How
 * to implement supply mechanisms].
 *
 * We have followed general OpenZeppelin guidelines: functions revert instead
 * of returning `false` on failure. This behavior is nonetheless conventional
 * and does not conflict with the expectations of ERC20 applications.
 *
 * Additionally, an {Approval} event is emitted on calls to {transferFrom}.
 * This allows applications to reconstruct the allowance for all accounts just
 * by listening to said events. Other implementations of the EIP may not emit
 * these events, as it isn't required by the specification.
 *
 * Finally, the non-standard {decreaseAllowance} and {increaseAllowance}
 * functions have been added to mitigate the well-known issues around setting
 * allowances. See {IERC20-approve}.
 */
contract ERC20 is Context, IERC20 {
    using SafeMath for uint256;

    mapping (address => uint256) private _balances;

    mapping (address => mapping (address => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;
    uint8 private _decimals;

    /**
     * @dev Sets the values for {name} and {symbol}, initializes {decimals} with
     * a default value of 18.
     *
     * To select a different value for {decimals}, use {_setupDecimals}.
     *
     * All three of these values are immutable: they can only be set once during
     * construction.
     */
    constructor (string memory name_, string memory symbol_) public {
        _name = name_;
        _symbol = symbol_;
        _decimals = 18;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5,05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the value {ERC20} uses, unless {_setupDecimals} is
     * called.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual returns (uint8) {
        return _decimals;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * Requirements:
     *
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for ``sender``'s tokens of at least
     * `amount`.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     *
     * This is internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(sender, recipient, amount);

        _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        _balances[account] = _balances[account].sub(amount, "ERC20: burn amount exceeds balance");
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Sets {decimals} to a value other than the default one of 18.
     *
     * WARNING: This function should only be called from the constructor. Most
     * applications that interact with token contracts will not expect
     * {decimals} to ever change, and may work incorrectly if it does.
     */
    function _setupDecimals(uint8 decimals_) internal virtual {
        _decimals = decimals_;
    }

    /**
     * @dev Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be to transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual { }
}

// SPDX-License-Identifier: MIT






/**
 * @dev Extension of {ERC20} that allows token holders to destroy both their own
 * tokens and those that they have an allowance for, in a way that can be
 * recognized off-chain (via event analysis).
 */
abstract contract ERC20Burnable is Context, ERC20 {
    using SafeMath for uint256;

    /**
     * @dev Destroys `amount` tokens from the caller.
     *
     * See {ERC20-_burn}.
     */
    function burn(uint256 amount) public virtual {
        _burn(_msgSender(), amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, deducting from the caller's
     * allowance.
     *
     * See {ERC20-_burn} and {ERC20-allowance}.
     *
     * Requirements:
     *
     * - the caller must have allowance for ``accounts``'s tokens of at least
     * `amount`.
     */
    function burnFrom(address account, uint256 amount) public virtual {
        uint256 decreasedAllowance = allowance(account, _msgSender()).sub(amount, "ERC20: burn amount exceeds allowance");

        _approve(account, _msgSender(), decreasedAllowance);
        _burn(account, amount);
    }
}

// SPDX-License-Identifier: MIT





/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    bool private _paused;

    /**
     * @dev Initializes the contract in unpaused state.
     */
    constructor () internal {
        _paused = false;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        require(!paused(), "Pausable: paused");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        require(paused(), "Pausable: not paused");
        _;
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

// SPDX-License-Identifier: MIT


/// @title Migration Agent interface
abstract contract MigrationAgent {

    function migrateFrom(address _from, uint256 _value) public virtual;
}

// SPDX-License-Identifier: MIT



/**
 * @dev Library for managing
 * https://en.wikipedia.org/wiki/Set_(abstract_data_type)[sets] of primitive
 * types.
 *
 * Sets have the following properties:
 *
 * - Elements are added, removed, and checked for existence in constant time
 * (O(1)).
 * - Elements are enumerated in O(n). No guarantees are made on the ordering.
 *
 * ```
 * contract Example {
 *     // Add the library methods
 *     using EnumerableSet for EnumerableSet.AddressSet;
 *
 *     // Declare a set state variable
 *     EnumerableSet.AddressSet private mySet;
 * }
 * ```
 *
 * As of v3.3.0, sets of type `bytes32` (`Bytes32Set`), `address` (`AddressSet`)
 * and `uint256` (`UintSet`) are supported.
 */
library EnumerableSet {
    // To implement this library for multiple types with as little code
    // repetition as possible, we write it in terms of a generic Set type with
    // bytes32 values.
    // The Set implementation uses private functions, and user-facing
    // implementations (such as AddressSet) are just wrappers around the
    // underlying Set.
    // This means that we can only create new EnumerableSets for types that fit
    // in bytes32.

    struct Set {
        // Storage of set values
        bytes32[] _values;

        // Position of the value in the `values` array, plus 1 because index 0
        // means a value is not in the set.
        mapping (bytes32 => uint256) _indexes;
    }

    /**
     * @dev Add a value to a set. O(1).
     *
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     */
    function _add(Set storage set, bytes32 value) private returns (bool) {
        if (!_contains(set, value)) {
            set._values.push(value);
            // The value is stored at length-1, but we add 1 to all indexes
            // and use 0 as a sentinel value
            set._indexes[value] = set._values.length;
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Removes a value from a set. O(1).
     *
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function _remove(Set storage set, bytes32 value) private returns (bool) {
        // We read and store the value's index to prevent multiple reads from the same storage slot
        uint256 valueIndex = set._indexes[value];

        if (valueIndex != 0) { // Equivalent to contains(set, value)
            // To delete an element from the _values array in O(1), we swap the element to delete with the last one in
            // the array, and then remove the last element (sometimes called as 'swap and pop').
            // This modifies the order of the array, as noted in {at}.

            uint256 toDeleteIndex = valueIndex - 1;
            uint256 lastIndex = set._values.length - 1;

            // When the value to delete is the last one, the swap operation is unnecessary. However, since this occurs
            // so rarely, we still do the swap anyway to avoid the gas cost of adding an 'if' statement.

            bytes32 lastvalue = set._values[lastIndex];

            // Move the last value to the index where the value to delete is
            set._values[toDeleteIndex] = lastvalue;
            // Update the index for the moved value
            set._indexes[lastvalue] = toDeleteIndex + 1; // All indexes are 1-based

            // Delete the slot where the moved value was stored
            set._values.pop();

            // Delete the index for the deleted slot
            delete set._indexes[value];

            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function _contains(Set storage set, bytes32 value) private view returns (bool) {
        return set._indexes[value] != 0;
    }

    /**
     * @dev Returns the number of values on the set. O(1).
     */
    function _length(Set storage set) private view returns (uint256) {
        return set._values.length;
    }

   /**
    * @dev Returns the value stored at position `index` in the set. O(1).
    *
    * Note that there are no guarantees on the ordering of values inside the
    * array, and it may change when more values are added or removed.
    *
    * Requirements:
    *
    * - `index` must be strictly less than {length}.
    */
    function _at(Set storage set, uint256 index) private view returns (bytes32) {
        require(set._values.length > index, "EnumerableSet: index out of bounds");
        return set._values[index];
    }

    // Bytes32Set

    struct Bytes32Set {
        Set _inner;
    }

    /**
     * @dev Add a value to a set. O(1).
     *
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     */
    function add(Bytes32Set storage set, bytes32 value) internal returns (bool) {
        return _add(set._inner, value);
    }

    /**
     * @dev Removes a value from a set. O(1).
     *
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function remove(Bytes32Set storage set, bytes32 value) internal returns (bool) {
        return _remove(set._inner, value);
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function contains(Bytes32Set storage set, bytes32 value) internal view returns (bool) {
        return _contains(set._inner, value);
    }

    /**
     * @dev Returns the number of values in the set. O(1).
     */
    function length(Bytes32Set storage set) internal view returns (uint256) {
        return _length(set._inner);
    }

   /**
    * @dev Returns the value stored at position `index` in the set. O(1).
    *
    * Note that there are no guarantees on the ordering of values inside the
    * array, and it may change when more values are added or removed.
    *
    * Requirements:
    *
    * - `index` must be strictly less than {length}.
    */
    function at(Bytes32Set storage set, uint256 index) internal view returns (bytes32) {
        return _at(set._inner, index);
    }

    // AddressSet

    struct AddressSet {
        Set _inner;
    }

    /**
     * @dev Add a value to a set. O(1).
     *
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     */
    function add(AddressSet storage set, address value) internal returns (bool) {
        return _add(set._inner, bytes32(uint256(uint160(value))));
    }

    /**
     * @dev Removes a value from a set. O(1).
     *
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function remove(AddressSet storage set, address value) internal returns (bool) {
        return _remove(set._inner, bytes32(uint256(uint160(value))));
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function contains(AddressSet storage set, address value) internal view returns (bool) {
        return _contains(set._inner, bytes32(uint256(uint160(value))));
    }

    /**
     * @dev Returns the number of values in the set. O(1).
     */
    function length(AddressSet storage set) internal view returns (uint256) {
        return _length(set._inner);
    }

   /**
    * @dev Returns the value stored at position `index` in the set. O(1).
    *
    * Note that there are no guarantees on the ordering of values inside the
    * array, and it may change when more values are added or removed.
    *
    * Requirements:
    *
    * - `index` must be strictly less than {length}.
    */
    function at(AddressSet storage set, uint256 index) internal view returns (address) {
        return address(uint160(uint256(_at(set._inner, index))));
    }


    // UintSet

    struct UintSet {
        Set _inner;
    }

    /**
     * @dev Add a value to a set. O(1).
     *
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     */
    function add(UintSet storage set, uint256 value) internal returns (bool) {
        return _add(set._inner, bytes32(value));
    }

    /**
     * @dev Removes a value from a set. O(1).
     *
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function remove(UintSet storage set, uint256 value) internal returns (bool) {
        return _remove(set._inner, bytes32(value));
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function contains(UintSet storage set, uint256 value) internal view returns (bool) {
        return _contains(set._inner, bytes32(value));
    }

    /**
     * @dev Returns the number of values on the set. O(1).
     */
    function length(UintSet storage set) internal view returns (uint256) {
        return _length(set._inner);
    }

   /**
    * @dev Returns the value stored at position `index` in the set. O(1).
    *
    * Note that there are no guarantees on the ordering of values inside the
    * array, and it may change when more values are added or removed.
    *
    * Requirements:
    *
    * - `index` must be strictly less than {length}.
    */
    function at(UintSet storage set, uint256 index) internal view returns (uint256) {
        return uint256(_at(set._inner, index));
    }
}

// SPDX-License-Identifier: MIT



/**
 * @dev Collection of functions related to the address type
 */
library Address {
    /**
     * @dev Returns true if `account` is a contract.
     *
     * [IMPORTANT]
     * ====
     * It is unsafe to assume that an address for which this function returns
     * false is an externally-owned account (EOA) and not a contract.
     *
     * Among others, `isContract` will return false for the following
     * types of addresses:
     *
     *  - an externally-owned account
     *  - a contract in construction
     *  - an address where a contract will be created
     *  - an address where a contract lived, but was destroyed
     * ====
     */
    function isContract(address account) internal view returns (bool) {
        // This method relies on extcodesize, which returns 0 for contracts in
        // construction, since the code is only stored at the end of the
        // constructor execution.

        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly { size := extcodesize(account) }
        return size > 0;
    }

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://diligence.consensys.net/posts/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.5.11/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        // solhint-disable-next-line avoid-low-level-calls, avoid-call-value
        (bool success, ) = recipient.call{ value: amount }("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }

    /**
     * @dev Performs a Solidity function call using a low level `call`. A
     * plain`call` is an unsafe replacement for a function call: use this
     * function instead.
     *
     * If `target` reverts with a revert reason, it is bubbled up by this
     * function (like regular Solidity function calls).
     *
     * Returns the raw returned data. To convert to the expected return value,
     * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
     *
     * Requirements:
     *
     * - `target` must be a contract.
     * - calling `target` with `data` must not revert.
     *
     * _Available since v3.1._
     */
    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
      return functionCall(target, data, "Address: low-level call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`], but with
     * `errorMessage` as a fallback revert reason when `target` reverts.
     *
     * _Available since v3.1._
     */
    function functionCall(address target, bytes memory data, string memory errorMessage) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0, errorMessage);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but also transferring `value` wei to `target`.
     *
     * Requirements:
     *
     * - the calling contract must have an ETH balance of at least `value`.
     * - the called Solidity function must be `payable`.
     *
     * _Available since v3.1._
     */
    function functionCallWithValue(address target, bytes memory data, uint256 value) internal returns (bytes memory) {
        return functionCallWithValue(target, data, value, "Address: low-level call with value failed");
    }

    /**
     * @dev Same as {xref-Address-functionCallWithValue-address-bytes-uint256-}[`functionCallWithValue`], but
     * with `errorMessage` as a fallback revert reason when `target` reverts.
     *
     * _Available since v3.1._
     */
    function functionCallWithValue(address target, bytes memory data, uint256 value, string memory errorMessage) internal returns (bytes memory) {
        require(address(this).balance >= value, "Address: insufficient balance for call");
        require(isContract(target), "Address: call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = target.call{ value: value }(data);
        return _verifyCallResult(success, returndata, errorMessage);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a static call.
     *
     * _Available since v3.3._
     */
    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        return functionStaticCall(target, data, "Address: low-level static call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
     * but performing a static call.
     *
     * _Available since v3.3._
     */
    function functionStaticCall(address target, bytes memory data, string memory errorMessage) internal view returns (bytes memory) {
        require(isContract(target), "Address: static call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = target.staticcall(data);
        return _verifyCallResult(success, returndata, errorMessage);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a delegate call.
     *
     * _Available since v3.4._
     */
    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionDelegateCall(target, data, "Address: low-level delegate call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
     * but performing a delegate call.
     *
     * _Available since v3.4._
     */
    function functionDelegateCall(address target, bytes memory data, string memory errorMessage) internal returns (bytes memory) {
        require(isContract(target), "Address: delegate call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return _verifyCallResult(success, returndata, errorMessage);
    }

    function _verifyCallResult(bool success, bytes memory returndata, string memory errorMessage) private pure returns(bytes memory) {
        if (success) {
            return returndata;
        } else {
            // Look for revert reason and bubble it up if present
            if (returndata.length > 0) {
                // The easiest way to bubble the revert reason is using memory via assembly

                // solhint-disable-next-line no-inline-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }
    }
}

// SPDX-License-Identifier: MIT







/**
 * @dev Contract module that allows children to implement role-based access
 * control mechanisms.
 *
 * Roles are referred to by their `bytes32` identifier. These should be exposed
 * in the external API and be unique. The best way to achieve this is by
 * using `public constant` hash digests:
 *
 * ```
 * bytes32 public constant MY_ROLE = keccak256("MY_ROLE");
 * ```
 *
 * Roles can be used to represent a set of permissions. To restrict access to a
 * function call, use {hasRole}:
 *
 * ```
 * function foo() public {
 *     require(hasRole(MY_ROLE, msg.sender));
 *     ...
 * }
 * ```
 *
 * Roles can be granted and revoked dynamically via the {grantRole} and
 * {revokeRole} functions. Each role has an associated admin role, and only
 * accounts that have a role's admin role can call {grantRole} and {revokeRole}.
 *
 * By default, the admin role for all roles is `DEFAULT_ADMIN_ROLE`, which means
 * that only accounts with this role will be able to grant or revoke other
 * roles. More complex role relationships can be created by using
 * {_setRoleAdmin}.
 *
 * WARNING: The `DEFAULT_ADMIN_ROLE` is also its own admin: it has permission to
 * grant and revoke this role. Extra precautions should be taken to secure
 * accounts that have been granted it.
 */
abstract contract AccessControl is Context {
    using EnumerableSet for EnumerableSet.AddressSet;
    using Address for address;

    struct RoleData {
        EnumerableSet.AddressSet members;
        bytes32 adminRole;
    }

    mapping (bytes32 => RoleData) private _roles;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
     *
     * `DEFAULT_ADMIN_ROLE` is the starting admin for all roles, despite
     * {RoleAdminChanged} not being emitted signaling this.
     *
     * _Available since v3.1._
     */
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /**
     * @dev Emitted when `account` is granted `role`.
     *
     * `sender` is the account that originated the contract call, an admin role
     * bearer except when using {_setupRole}.
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Emitted when `account` is revoked `role`.
     *
     * `sender` is the account that originated the contract call:
     *   - if using `revokeRole`, it is the admin role bearer
     *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role].members.contains(account);
    }

    /**
     * @dev Returns the number of accounts that have `role`. Can be used
     * together with {getRoleMember} to enumerate all bearers of a role.
     */
    function getRoleMemberCount(bytes32 role) public view returns (uint256) {
        return _roles[role].members.length();
    }

    /**
     * @dev Returns one of the accounts that have `role`. `index` must be a
     * value between 0 and {getRoleMemberCount}, non-inclusive.
     *
     * Role bearers are not sorted in any particular way, and their ordering may
     * change at any point.
     *
     * WARNING: When using {getRoleMember} and {getRoleMemberCount}, make sure
     * you perform all queries on the same block. See the following
     * https://forum.openzeppelin.com/t/iterating-over-elements-on-enumerableset-in-openzeppelin-contracts/2296[forum post]
     * for more information.
     */
    function getRoleMember(bytes32 role, uint256 index) public view returns (address) {
        return _roles[role].members.at(index);
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) public view returns (bytes32) {
        return _roles[role].adminRole;
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) public virtual {
        require(hasRole(_roles[role].adminRole, _msgSender()), "AccessControl: sender must be an admin to grant");

        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) public virtual {
        require(hasRole(_roles[role].adminRole, _msgSender()), "AccessControl: sender must be an admin to revoke");

        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been granted `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `account`.
     */
    function renounceRole(bytes32 role, address account) public virtual {
        require(account == _msgSender(), "AccessControl: can only renounce roles for self");

        _revokeRole(role, account);
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event. Note that unlike {grantRole}, this function doesn't perform any
     * checks on the calling account.
     *
     * [WARNING]
     * ====
     * This function should only be called from the constructor when setting
     * up the initial roles for the system.
     *
     * Using this function in any other way is effectively circumventing the admin
     * system imposed by {AccessControl}.
     * ====
     */
    function _setupRole(bytes32 role, address account) internal virtual {
        _grantRole(role, account);
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     *
     * Emits a {RoleAdminChanged} event.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        emit RoleAdminChanged(role, _roles[role].adminRole, adminRole);
        _roles[role].adminRole = adminRole;
    }

    function _grantRole(bytes32 role, address account) private {
        if (_roles[role].members.add(account)) {
            emit RoleGranted(role, account, _msgSender());
        }
    }

    function _revokeRole(bytes32 role, address account) private {
        if (_roles[role].members.remove(account)) {
            emit RoleRevoked(role, account, _msgSender());
        }
    }
}

// SPDX-License-Identifier: MIT




/// @title Locked
/// @dev Smart contract to enable locking and unlocking of token holders. 
contract Locked is AccessControl {

    mapping (address => bool) public lockedList;

    event AddedLock(address user);
    event RemovedLock(address user);

    // Create a new role identifier for the controller role
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

       modifier isController {
            require(hasRole(CONTROLLER_ROLE, msg.sender), "Locked::isController - Caller is not a controller");

        _;
    }


    /// @dev terminate transaction if any of the participants is locked
    /// @param _from - user initiating process
    /// @param _to  - user involved in process
    modifier isNotLocked(address _from, address _to) {

        if (hasRole(DEFAULT_ADMIN_ROLE, _from)){  // allow contract admin on sending tokens even if recipient is locked
            require(!lockedList[_from], "Locked::isNotLocked - User is locked");
            require(!lockedList[_to], "Locked::isNotLocked - User is locked");
        }
        _;
    }

    /// @dev check if user has been locked
    /// @param _user - usr to check
    /// @return true or false
    function isLocked(address _user) public view returns (bool) {
        return lockedList[_user];
    }
    
    /// @dev add user to lock
    /// @param _user to lock
    function addLock (address _user) public  isController() {        
        _addLock(_user);
    }

    function addLockMultiple(address[] memory _users) public isController() {
        uint256 length = _users.length;
        require(length <= 256, "Locked-addLockMultiple: List too long");
        for (uint256 i = 0; i < length; i++) {
            _addLock(_users[i]);
        }
    }

    /// @dev unlock user
    /// @param _user - user to unlock
    function removeLock (address _user) isController() public {       
        _removeLock(_user);
    }


    /// @dev add user to lock for internal needs
    /// @param _user to lock
    function _addLock(address _user) internal {
        lockedList[_user] = true;
        emit AddedLock(_user);
    }

    /// @dev unlock user for internal needs
    /// @param _user - user to unlock
    function _removeLock (address _user) internal {
        lockedList[_user] = false;
        emit RemovedLock(_user);
    }

}

// SPDX-License-Identifier: MIT


pragma experimental ABIEncoderV2;








contract AuditToken is Locked, ERC20, Pausable, ERC20Burnable{
      
    /// @notice A record of each accounts delegate
    mapping (address => address) public delegates;

    /// @notice A checkpoint for marking number of votes from a given block
    struct Checkpoint {
        uint32 fromBlock;
        uint96 votes;
    }

    /// @notice A record of votes checkpoints for each account, by index
    mapping (address => mapping (uint32 => Checkpoint)) public checkpoints;

    /// @notice The number of checkpoints for each account
    mapping (address => uint32) public numCheckpoints;

    /// @notice The EIP-712 typehash for the contract's domain
    bytes32 public constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

    /// @notice The EIP-712 typehash for the delegation struct used by the contract
    bytes32 public constant DELEGATION_TYPEHASH = keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

    /// @notice A record of states for signing / validating signatures
    mapping (address => uint) public nonces;

    /// @notice An event thats emitted when an account changes its delegate
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);

    /// @notice An event thats emitted when a delegate account's vote balance changes
    event DelegateVotesChanged(address indexed delegate, uint previousBalance, uint newBalance);


    uint8 public constant DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY = 250000000 * (10**uint256(DECIMALS));
    address public migrationAgent;
    uint256 public totalMigrated;
    
    event Migrate(address indexed from, address indexed to, uint256 value);
    event MigrationAgentSet(address indexed migrationAgent);
    event LogControllerSet(address indexed controller);
    event LogControllerRevoked(address indexed controller);

    /// @dev Constructor that gives an account all initial tokens.
    constructor(address account) ERC20("Auditchain", "AUDT") {
        require(account != address(0), "AuditToken:constructor - Address can't be 0");
        _mint(account, INITIAL_SUPPLY);      
        _setupRole(DEFAULT_ADMIN_ROLE, account);
    }

    /// @dev prevent accidental sending of tokens to this token contract
    /// @param _self - address of this contract
    modifier notSelf(address _self) {
        require(
            _self != address(this),
            "You are trying to send tokens to this token contract"
        );
        _;
    }

    /// @notice Overwrite parent implementation to add locked verification, notSelf modifiers and call to moveDelegates
    function transfer(address to, uint256 value)
        public
        override
        isNotLocked(msg.sender, to)
        notSelf(to)
        returns (bool)
    {
        _moveDelegates(delegates[msg.sender], delegates[to], uint96(value));
        return super.transfer(to, value);
    }

   /// @notice Overwrite parent implementation to add locked verification, notSelf modifiers and call to moveDelegates
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public override isNotLocked(from, to) notSelf(to) returns (bool) {
         _moveDelegates(delegates[from], delegates[to], uint96(value));
        return super.transferFrom(from, to, value);
    }


    /// @dev Function to mint tokens
    /// @param to address to which new minted tokens are sent
    /// @param amount of tokens to send 
    /// @return A boolean that indicates if the operation was successful.
    function mint(address to, uint256 amount) public isController() returns (bool) {       
        require(to != address(0), "Token:mint - Recipient address can't be 0");        
        _mint(to, amount);
        return true;
    }

    /// @notice Overwrite parent implementation to add locked verification 
    function burn (uint256 amount) public override  isNotLocked(msg.sender, msg.sender) {
        super.burn(amount);
    }

    /// @notice Overwrite parent implementation to add locked verification 
    function burnFrom (address user, uint256 amount) public override  isNotLocked(msg.sender, msg.sender) {
        super.burnFrom(user, amount);
    }

     function pause() public isController()  {                  
        super._pause();
    }

    function unpause() public  isController() {          
        super._unpause();
    }

        /// @notice Migrate tokens to the new token contract.
    function migrate() external whenNotPaused() {
        uint256 value = balanceOf(msg.sender);
        require(migrationAgent != address(0), "Token:migrate - Enter migration agent address");
        require(value > 0, "Token:migrate - Amount of tokens is required");

        _addLock(msg.sender);
        _burn(msg.sender, balanceOf(msg.sender));
        totalMigrated += value;
        MigrationAgent(migrationAgent).migrateFrom(msg.sender, value);
        _removeLock(msg.sender);
        emit Migrate(msg.sender, migrationAgent, value);
    }

    /// @notice Set address of migration target contract and enable migration process
    /// @param _agent The address of the MigrationAgent contract
    function setMigrationAgent(address _agent) external  {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "AuditToken-setMigrationAgent: Only admin can call this function");
        require(_agent != address(0), "Token:setMigrationAgent - Migration agent can't be 0");
        migrationAgent = _agent;
        emit MigrationAgentSet(_agent);
    }
    
    /**
     * @notice Delegate votes from `msg.sender` to `delegatee`
     * @param delegatee The address to delegate votes to
     */
    function delegate(address delegatee) public {
        return _delegate(msg.sender, delegatee);
    }

    /**
     * @notice Delegates votes from signatory to `delegatee`
     * @param delegatee The address to delegate votes to
     * @param nonce The contract state required to match the signature
     * @param expiry The time at which to expire the signature
     * @param v The recovery byte of the signature
     * @param r Half of the ECDSA signature pair
     * @param s Half of the ECDSA signature pair
     */
    function delegateBySig(address delegatee, uint nonce, uint expiry, uint8 v, bytes32 r, bytes32 s) public {
        bytes32 domainSeparator = keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name())), getChainId(), address(this)));
        bytes32 structHash = keccak256(abi.encode(DELEGATION_TYPEHASH, delegatee, nonce, expiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        address signatory = ecrecover(digest, v, r, s);
        require(signatory != address(0), "auditToken::delegateBySig: invalid signature");
        require(nonce == nonces[signatory]++, "auditToken::delegateBySig: invalid nonce");
        require(block.timestamp <= expiry, "auditToken::delegateBySig: signature expired");
        return _delegate(signatory, delegatee);
    }

    /**
     * @notice Gets the current votes balance for `account`
     * @param account The address to get votes balance
     * @return The number of current votes for `account`
     */
    function getCurrentVotes(address account) external view returns (uint96) {
        uint32 nCheckpoints = numCheckpoints[account];
        return nCheckpoints > 0 ? checkpoints[account][nCheckpoints - 1].votes : 0;
    }

    /**
     * @notice Determine the prior number of votes for an account as of a block number
     * @dev Block number must be a finalized block or else this function will revert to prevent misinformation.
     * @param account The address of the account to check
     * @param blockNumber The block number to get the vote balance at
     * @return The number of votes the account had as of the given block
     */
    function getPriorVotes(address account, uint blockNumber) public view returns (uint96) {
        require(blockNumber < block.number, "auditToken::getPriorVotes: not yet determined");

        uint32 nCheckpoints = numCheckpoints[account];
        if (nCheckpoints == 0) {
            return 0;
        }

        // First check most recent balance
        if (checkpoints[account][nCheckpoints - 1].fromBlock <= blockNumber) {
            return checkpoints[account][nCheckpoints - 1].votes;
        }

        // Next check implicit zero balance
        if (checkpoints[account][0].fromBlock > blockNumber) {
            return 0;
        }

        uint32 lower = 0;
        uint32 upper = nCheckpoints - 1;
        while (upper > lower) {
            uint32 center = upper - (upper - lower) / 2; // ceil, avoiding overflow
            Checkpoint memory cp = checkpoints[account][center];
            if (cp.fromBlock == blockNumber) {
                return cp.votes;
            } else if (cp.fromBlock < blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }
        return checkpoints[account][lower].votes;
    }

    function _delegate(address delegator, address delegatee) internal {
        address currentDelegate = delegates[delegator];
        uint96 delegatorBalance = uint96(balanceOf(delegator));
        delegates[delegator] = delegatee;

        emit DelegateChanged(delegator, currentDelegate, delegatee);

        _moveDelegates(currentDelegate, delegatee, delegatorBalance);
    }   

    function _moveDelegates(address srcRep, address dstRep, uint96 amount) internal {
        if (srcRep != dstRep && amount > 0) {
            if (srcRep != address(0)) {
                uint32 srcRepNum = numCheckpoints[srcRep];
                uint96 srcRepOld = srcRepNum > 0 ? checkpoints[srcRep][srcRepNum - 1].votes : 0;
                uint96 srcRepNew = sub96(srcRepOld, amount, "auditToken::_moveVotes: vote amount underflows");
                _writeCheckpoint(srcRep, srcRepNum, srcRepOld, srcRepNew);
            }

            if (dstRep != address(0)) {
                uint32 dstRepNum = numCheckpoints[dstRep];
                uint96 dstRepOld = dstRepNum > 0 ? checkpoints[dstRep][dstRepNum - 1].votes : 0;
                uint96 dstRepNew = add96(dstRepOld, amount, "auditToken::_moveVotes: vote amount overflows");
                _writeCheckpoint(dstRep, dstRepNum, dstRepOld, dstRepNew);
            }
        }
    }

    function _writeCheckpoint(address delegatee, uint32 nCheckpoints, uint96 oldVotes, uint96 newVotes) internal {
      uint32 blockNumber = safe32(block.number, "auditToken::_writeCheckpoint: block number exceeds 32 bits");

      if (nCheckpoints > 0 && checkpoints[delegatee][nCheckpoints - 1].fromBlock == blockNumber) {
          checkpoints[delegatee][nCheckpoints - 1].votes = newVotes;
      } else {
          checkpoints[delegatee][nCheckpoints] = Checkpoint(blockNumber, newVotes);
          numCheckpoints[delegatee] = nCheckpoints + 1;
      }

      emit DelegateVotesChanged(delegatee, oldVotes, newVotes);
    }

    function safe32(uint n, string memory errorMessage) internal pure returns (uint32) {
        require(n < 2**32, errorMessage);
        return uint32(n);
    }

    function add96(uint96 a, uint96 b, string memory errorMessage) internal pure returns (uint96) {
        uint96 c = a + b;
        require(c >= a, errorMessage);
        return c;
    }

    function sub96(uint96 a, uint96 b, string memory errorMessage) internal pure returns (uint96) {
        require(b <= a, errorMessage);
        return a - b;
    }

    function getChainId() internal pure returns (uint) {
        uint256 chainId;
        assembly { chainId := chainid() }
        return chainId;
    }

    


}

// SPDX-License-Identifier: MIT







/**
 * @title SafeERC20
 * @dev Wrappers around ERC20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    using SafeMath for uint256;
    using Address for address;

    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    /**
     * @dev Deprecated. This function has issues similar to the ones found in
     * {IERC20-approve}, and its usage is discouraged.
     *
     * Whenever possible, use {safeIncreaseAllowance} and
     * {safeDecreaseAllowance} instead.
     */
    function safeApprove(IERC20 token, address spender, uint256 value) internal {
        // safeApprove should only be called when setting an initial allowance,
        // or when resetting it to zero. To increase and decrease it, use
        // 'safeIncreaseAllowance' and 'safeDecreaseAllowance'
        // solhint-disable-next-line max-line-length
        require((value == 0) || (token.allowance(address(this), spender) == 0),
            "SafeERC20: approve from non-zero to non-zero allowance"
        );
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, value));
    }

    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 newAllowance = token.allowance(address(this), spender).add(value);
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    function safeDecreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 newAllowance = token.allowance(address(this), spender).sub(value, "SafeERC20: decreased allowance below zero");
        _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, newAllowance));
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves. We use {Address.functionCall} to perform this call, which verifies that
        // the target address contains contract code and also asserts for success in the low-level call.

        bytes memory returndata = address(token).functionCall(data, "SafeERC20: low-level call failed");
        if (returndata.length > 0) { // Return data is optional
            // solhint-disable-next-line max-line-length
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}

// SPDX-License-Identifier: MIT

    
interface ICohort {
    function resetOutstandingValidations() external;
    function enterprise() external returns (address);
    function outstandingValidations() external view returns (uint256);
    function returnValidators() external view returns(address[] memory);
    function addAdditionalValidator(address additionalValidator) external returns (bool);
    function removeValidator(address validator, address _enterprise) external returns (bool);
}

// SPDX-License-Identifier: MIT
    
    
interface ICohortFactory {

    function returnCohorts(address enterprise) external view returns (address[] memory, uint256[] memory);
    function returnOutstandingValidations() external view returns(uint256);
}

// SPDX-License-Identifier: MIT

pragma experimental ABIEncoderV2;








/**
 * @title Members
 * Allows on creation of Enterprise and Validator accounts and staking of funds by validators
 * Validators and enterprises have ability to withdraw their staking and earnings 
 * Contract also contains several update functions controlled by the Governance contracts
 */

contract Members is  AccessControl {

    using SafeMath for uint256;
    using SafeERC20 for AuditToken;

    struct DataSubscriberTypes{
        address cohort;
        uint256 audits;
    }

    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant SETTER_ROLE =  keccak256("SETTER_ROLE");

    AuditToken public auditToken;                       //AUDT token 
    ICohortFactory public cohortFactory;
    uint256 public stakedAmount;                        //total number of staked tokens   
    mapping(address => uint256) public deposits;        //track deposits per user
    mapping(address => DataSubscriberTypes[]) public dataSubscriberCohorts;
    mapping(address => mapping(address => bool)) public dataSubscriberCohortMap;
    uint256 public amountTokensPerValidation =  1e18;    //New minted amount per validation

    uint256 public accessFee = 1000e18;
    uint256 public enterpriseShareSubscriber = 40;
    uint256 public validatorShareSubscriber = 40;
    address public platformAddress;
    uint256 public platformShareValidation = 15;    
    uint256 public recentBlockUpdated;
    uint256 public enterpriseMatch = 15e3;          //allow fractional enterprise match up to 4 decimal points
    uint256 public minDepositDays = 30;
 
    /// @dev check if caller is a controller     
    modifier isController {
        require(hasRole(CONTROLLER_ROLE, msg.sender), "Members:IsController - Caller is not a controller");

        _;
    }

    /// @dev check if caller is a setter     
    modifier isSetter {
        require(hasRole(SETTER_ROLE, msg.sender), "Members:isSetter - Caller is not a setter");

        _;
    }

     // Audit types to be used. Two types added for future expansion 
    enum UserType {Enterprise, Validator, DataSubscriber, RuleCreator}

    // Structure to store address and name of the registered
    struct User {  
        address user;
        string name;                                                                                                                         
    }

    User[] public enterprises;
    mapping(address => bool) public enterpriseMap;
    // mapping(address => uint256) public enterpriseNameMap;

    User[] public ruleCreators;
    mapping(address => bool) public ruleCreatorMap;
    // mapping(address => uint256) public ruleCreatorNameMap;

    User[] public validators;
    mapping(address => bool) public validatorMap;
    mapping(address => uint256) public validatorNameMap;

    User[] public dataSubscribers;
    mapping(address => bool) public dataSubscriberMap;
    // mapping(address => uint256) public dataSubscriberNameMap;
   
    
    event EnterpriseUserAdded(address indexed user, string name);
    event UserAdded(address indexed user, string name, UserType userType);
    event LogDepositReceived(address indexed from, uint amount);
    event LogRewardsRedeemed(address indexed from, uint256 amount);
    event LogDataSubscriberPaid(address indexed from, uint256 accessFee,  address cohortAddress, address enterprise, uint256 enterpriseShare);
    event LogDataSubscriberValidatorPaid(address  from, address indexed validator, uint256 amount);
    event LogRewardsDeposited(address cohort, uint256 tokens, uint256 enterpriseAmount, address indexed enterprise);
    event LogRewardsReceived(address indexed validator, uint256 tokens );
    event LogSubscriptionCompleted(address subscriber, uint256 numberOfSubscriptions);
    event LogUpdateRewards(uint256 rewards);
    event LogUpdateEnterpriseMatch(uint256 portion);
    event LogUpdateMinDepositDays(uint256 minDepositDays);

    constructor(AuditToken _auditToken, address _platformAddress ) {

        require(_auditToken != AuditToken(0), "Members:constructor - Audit token address can't be 0");
        require(_platformAddress != address(0), "Members:constructor - Platform address can't be 0");
        auditToken = _auditToken;        
        platformAddress = _platformAddress;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
    * @dev to be called by administrator to set cohort Factory contract
    * @param _cohortFactory cohortFactory contract
    */
    function setCohortFactory(address _cohortFactory) public isController() {

        require(_cohortFactory != address(0), "Members:setCohortFactory - CohortFactory address can't be 0");
        cohortFactory = ICohortFactory(_cohortFactory);
    }


    /**
    * @dev to be called by Governance contract to update new amount for validation rewards
    * @param _amountTokensPerValidation new value of reward per validation
    */
    function updateRewards(uint256 _amountTokensPerValidation) public isSetter() {

        require(_amountTokensPerValidation != 0, "Members:updateRewards - New value for the reward can't be 0");
        amountTokensPerValidation = _amountTokensPerValidation;
        emit LogUpdateRewards(_amountTokensPerValidation);
    }


    /**
    * @dev to be called by Governance contract to update days to calculate enterprise min deposit requirements
    * @param _minDepositDays new value of min deposit days
    */
    function updateMinDepositDays(uint256 _minDepositDays) public isSetter()  {

        require(_minDepositDays != 0, "Members:updateMinDepositDays - New value for the min deposit days can't be 0");
        minDepositDays = _minDepositDays;
        emit LogUpdateMinDepositDays(_minDepositDays);
    }
    
    /**
    * @dev to be called by Governance contract
    * @param _enterpriseMatch new value of enterprise portion of enterprise value of validation cost
    */
    function updateEnterpriseMatch(uint256 _enterpriseMatch) public isSetter()  {

        require(_enterpriseMatch != 0, "Members:updateMinDepositDays - New value for the enterprise match can't be 0");
        enterpriseMatch = _enterpriseMatch;
        emit LogUpdateEnterpriseMatch(_enterpriseMatch);
    }

    /**
    * @dev to be called by Governance contract to change enterprise and validators shares
    * of data subscription fees. 
    * @param _enterpriseShareSubscriber  - share of the enterprise
    * @param _validatorShareSubscriber - share of the subscribers
    */
    function setDataSubscriberShares(uint256 _enterpriseShareSubscriber, uint256 _validatorShareSubscriber ) public isSetter()  {

        require(_enterpriseShareSubscriber.add(validatorShareSubscriber) <=100, "Enterprise and Validator shares can't be larger than 100");
        enterpriseShareSubscriber = _enterpriseShareSubscriber;
        validatorShareSubscriber = _validatorShareSubscriber;
    }

    /**
     * @dev Function to accept contribution to staking
     * @param amount number of AUDT tokens sent to contract for staking     
     */ 
     function stake(uint256 amount) public {

        require(amount > 0, "Members:stake - Amount can't be 0");

        if (validatorMap[msg.sender]){ 
            require(amount + deposits[msg.sender] >= 5e21, "Staking:stake - Minimum contribution amount is 5000 AUDT tokens");  
            require(amount + deposits[msg.sender] <= 25e21, "Staking:stake - Maximum contribution amount is 25000 AUDT tokens");     
        }
        require(validatorMap[msg.sender] || enterpriseMap[msg.sender], "Staking:stake - User has been not registered as a validator or enterprise."); 
        stakedAmount = stakedAmount.add(amount);  // track tokens contributed so far
        auditToken.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] = deposits[msg.sender].add(amount);
        emit LogDepositReceived(msg.sender, amount);       
    }

    /**
    * @dev to be called by scheduled calls by platform daily to save gas
    * the process can be called at any time 
    * @param _validators - list of validators eligible for earnings
    * @param tokens - list of tokens earned by each validator
    */
    function updateDailyEarningsTransferFunds(address[] memory _validators, uint256[] memory tokens, address cohort) public isController() {

        require(cohort != address(0), "Cohort address can't be 0");
        require(_validators.length == tokens.length, "Members:updateDailyEarningsTransferFunds - List of validators doesn't match list  of their respective tokens");

        uint256 totalRewardTokens;

        address enterpriseAddress = ICohort(cohort).enterprise();
        ICohort(cohort).resetOutstandingValidations();
        uint256 totalEnterprisePay;

        for (uint256 i=0; i< _validators.length; i++){
            require(_validators[i] != address(0), "One of the validators in the list has address 0");
            // 1e4 to adjust for 4 decimal points for enterpriseMatch
            uint256 enterprisePortion =  (tokens[i].mul(enterpriseMatch).div(1e4));
            totalEnterprisePay = totalEnterprisePay.add(enterprisePortion);
            deposits[_validators[i]] = deposits[_validators[i]].add(tokens[i]).add(enterprisePortion);
            totalRewardTokens = totalRewardTokens.add(tokens[i]);
            LogRewardsReceived(_validators[i], tokens[i].add(enterprisePortion));
        }
        // decrease enterprise token amount by its reward share to validators
        deposits[enterpriseAddress] = deposits[enterpriseAddress].sub(totalEnterprisePay);

        uint256 amountTokensPlatform = totalRewardTokens.mul(platformShareValidation).div(85);
        
        recentBlockUpdated = block.number;
        auditToken.mint(platformAddress, amountTokensPlatform);
        auditToken.mint(address(this), totalRewardTokens);
        emit LogRewardsDeposited(cohort, totalRewardTokens, totalEnterprisePay, enterpriseAddress);
    }

    /**
    * @dev called when data subscriber initiates subscription 
    * @param cohortAddress - address of the cohort to which data subscriber wants access 
    * @param audits - type of audits this cohort is part of
    */
    function dataSubscriberPayment(address cohortAddress, uint256 audits) public  {

        require(cohortAddress != address(0), "Members:dataSubscriberPayment - Cohort address can't be 0");
        require(audits >=0 && audits <=5, "Audit type is not in the required range");
        require(!dataSubscriberCohortMap[msg.sender][cohortAddress], "Members:dataSubscriberPayment - You are already subscribed");
        require(dataSubscriberMap[msg.sender], "Members:dataSubscriberPayment - You have to register as data subscriber");

        auditToken.safeTransferFrom(msg.sender, address(this), accessFee);
        uint platformShare = (((enterpriseShareSubscriber).add(validatorShareSubscriber)).mul(100)).div(accessFee);
        auditToken.safeTransfer(platformAddress, accessFee.mul(platformShare).div(100));
        // auditToken.safeTransfer(platformAddress, accessFee.mul((uint256(100)).sub(enterpriseShareSubscriber).sub(validatorShareSubscriber)).div(100));

        if (validatorMap[msg.sender] || enterpriseMap[msg.sender]){
            stakedAmount = stakedAmount.sub(accessFee);  // track tokens contributed so far
            deposits[msg.sender] = deposits[msg.sender].sub(accessFee);
        }

        address cohortOwner = ICohort(cohortAddress).enterprise();
        uint256 enterpriseShare = accessFee.mul(enterpriseShareSubscriber).div(100);
        deposits[cohortOwner] = deposits[cohortOwner].add(enterpriseShare);
        allocateValidatorDataSubscriberFee(cohortAddress, accessFee.mul(validatorShareSubscriber).div(100));
        dataSubscriberCohorts[msg.sender].push();
        dataSubscriberCohorts[msg.sender][dataSubscriberCohorts[msg.sender].length -1].cohort = cohortAddress;
        dataSubscriberCohorts[msg.sender][dataSubscriberCohorts[msg.sender].length- 1].audits = audits;
        dataSubscriberCohortMap[msg.sender][cohortAddress] = true;

        emit LogDataSubscriberPaid(msg.sender, accessFee, cohortAddress, cohortOwner, enterpriseShare);
    }

    /**
    * @dev To return all cohorts to which data subscriber is subscribed to 
    * @param subscriber - address of the subscriber
    * @return the structure with cohort address and their types for subscriber
    */
    function returnCohortsForDataSubscriber(address subscriber) public view returns(DataSubscriberTypes[] memory){
            return (dataSubscriberCohorts[subscriber]);
    }

    /**
    * @dev To automate subscription for multiple cohorts for data subscriber 
    * @param cohortAddress - array of cohort addresses
    * @param audits - array of audit types for each cohort
    */
    function dataSubscriberPaymentMultiple(address[] memory cohortAddress, uint256[] memory audits) public {

        uint256 length = cohortAddress.length;
        require(length <= 256, "Members-dataSubscriberPaymentMultiple: List too long");
        for (uint256 i = 0; i < length; i++) {
            dataSubscriberPayment(cohortAddress[i], audits[i]);
        }

        emit LogSubscriptionCompleted(msg.sender, length);
    }

    /**
    * @dev To calculate validator share of data subscriber fee and allocate it to validator deposits
    * @param cohortAddress - address of cohort holding list of validators
    * @param amount - total amount of tokens available for allocation
    */
    function allocateValidatorDataSubscriberFee(address cohortAddress, uint amount) internal  {

        address[] memory cohortValidators = ICohort(cohortAddress).returnValidators();
        uint256 totalDeposits;

        for (uint i=0; i < cohortValidators.length; i++){
            totalDeposits = totalDeposits.add(deposits[cohortValidators[i]]);
        }

        for (uint i=0; i < cohortValidators.length; i++){
            uint256 oneValidatorPercentage = (deposits[cohortValidators[i]].mul(10e18)).div(totalDeposits);
            uint256 oneValidatorAmount = amount.mul(oneValidatorPercentage).div(10e18);
            deposits[cohortValidators[i]] = deposits[cohortValidators[i]].add(accessFee.mul(oneValidatorAmount).div(100).div(10e18)  );
            emit LogDataSubscriberValidatorPaid(msg.sender, cohortValidators[i], oneValidatorAmount);
        }
    }
   
     /**
     * @dev Function to redeem contribution. 
     * @param amount number of tokens being redeemed
     */
    function redeem(uint256 amount) public {

          if (enterpriseMap[msg.sender]){
              // div(1e4) to adjust for four decimal points
            require(deposits[msg.sender]
            .sub(enterpriseMatch.mul(amountTokensPerValidation).mul(cohortFactory.returnOutstandingValidations()).div(1e4)) >= amount, 
            "Member:redeem - Your deposit will be too low to fullfil your outstanding payments.");
          }

        stakedAmount = stakedAmount.sub(amount);       
        deposits[msg.sender] = deposits[msg.sender].sub(amount);
        auditToken.safeTransfer(msg.sender, amount);
        emit LogRewardsRedeemed(msg.sender, amount);
        
    }

   
    /*
    * @dev add new platform user
    * @param user to add
    * @param name name of the user
    * @param userType  
    */
    function addUser(address user, string memory name, UserType userType) public isController() {

        User memory newUser;
        newUser.user = user;
        newUser.name = name;

        if (userType == UserType.DataSubscriber){
            require(!dataSubscriberMap[user], "Members:addUser - This Data Subscriber already exist.");
            dataSubscribers.push(newUser);
            dataSubscriberMap[user]= true;
            // dataSubscriberNameMap[user] = dataSubscribers.length - 1;
        }
        else if (userType == UserType.Validator){            
            require(!validatorMap[user], "Members:addUser - This Validator already exist.");
            validators.push(newUser);
            validatorMap[user]= true;
            // validatorNameMap[user] = validators.length - 1;
        }
        else if (userType == UserType.Enterprise){
            require(!enterpriseMap[user], "Members:addUser - This Enterprise already exist.");
            enterprises.push(newUser);
            enterpriseMap[user]= true;
            // enterpriseNameMap[user] = enterprises.length - 1;
        }
        else if (userType == UserType.RuleCreator){
            require(!enterpriseMap[user], "Members:addUser - This Rule Creator already exist.");
            ruleCreators.push(newUser);
            ruleCreatorMap[user]= true;
            // ruleCreatorNameMap[user] = enterprises.length - 1;
        }

        emit UserAdded(user, name, userType);
    }

    /*
    * @dev return enterprise count
    */
    function returnEnterpriseCount() public view returns (uint256) {

        return enterprises.length;
    }

    /*
    * @dev return validator count
    */
    function returnValidatorCount() public view returns (uint256) {

        return validators.length;
    }

    /*
    * @dev return data subscribers count
    */
    function returnDataSubscriberCount() public view returns (uint256) {

        return dataSubscribers.length;
    }

     /*
    * @dev return data rule creators count
    */
    function returnRuleCreatorsCount() public view returns (uint256) {

        return dataSubscribers.length;
    }

}

// SPDX-License-Identifier: MIT








/**
 * @title Cohort
 * Allows on creation of cohort by Enterprise based on invitations. 
 * Enterprise can create cohort consisting of invited Validators.
 * Later Enterprise can remove inactive validators and invite new ones. 
 */
contract Cohort is AccessControl {
    using SafeMath for uint256;
    using SafeERC20 for AuditToken;

    address public enterprise;
    address[] public validators;
    uint256 public platformShare = 15; //Percentage of platform share
    uint256 public requiredQuorum = 75;
    AuditToken public auditToken;
    Members public members;
    uint256 public outstandingValidations;
    bool initialized;
    address cohortFactory;

    // Create a new role identifier for the controller role
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant SETTER_ROLE = keccak256("SETTER_ROLE");

    // check if caller is authorized to make the call
    modifier isController {
        require( hasRole(CONTROLLER_ROLE, msg.sender),
            "Cohort:isController - Caller is not a controller");
        _;
    }
    /// @dev check if caller is a setter
    modifier isSetter {
        require(hasRole(SETTER_ROLE, msg.sender),
            "Members:isSetter - Caller is not a setter"
        );
        _;
    }

    // Audit types to be used. Three types added for future expansion
    enum AuditTypes {Financial, System, Contract, NFT, Type5, Type6}

    AuditTypes public audits;

    // Validation can be approved or disapproved. Initial status is undefined.
    enum ValidationStatus {Undefined, Yes, No}

    struct Validation {
        uint256 validationTime;
        uint256 executionTime;
        mapping(address => ValidationStatus) validatorChoice;
    }

    mapping(bytes32 => Validation) public validations; // track each validation
    mapping(address => uint256) public deposits; //track deposits per user

    event ValidationInitialized(bytes32 validationHash, uint256 indexed initTime, bytes32 documentHash);
    event ValidatorValidated(address validator, bytes32 indexed documentHash, uint256 validationTime, ValidationStatus decision);
    event ValidationExecuted(bytes32 indexed validationHash, uint256 indexed timeExecuted, bytes32 documentHash);
    event additionalValidatorAdded(address indexed validator);
    event ValidatorRemoved(address validator);
    event LogOutstandingValidationRest(uint256 count);

    /**
     * @dev Called from CohortFactory.sol by Enterprise within the cohort creation function
     * @param _auditTokenAddress     // address of AUDT token contract
     * @param _members               // address of Members contract
     * @param _enterprise            // address of enterprise user
     * @param _validators            // list of invited validators
     * @param _audits                // audit type
     */
    function initialize(
        address _auditTokenAddress,
        Members _members,
        address _enterprise,
        address[] memory _validators,
        uint256 _audits,
        address _cohortFactory
    ) public {
        require(!initialized,"Cohort:initialize - this Cohort has been already initialized.");
        enterprise = _enterprise;
        validators = _validators;
        audits = AuditTypes(_audits);
        auditToken = AuditToken(_auditTokenAddress);
        members = _members;
        address tokenAdmin = auditToken.getRoleMember(DEFAULT_ADMIN_ROLE, 0); // get admin of token contract
        _setupRole(DEFAULT_ADMIN_ROLE, tokenAdmin);
        initialized = true;
        cohortFactory = _cohortFactory;
    }

    /**
     * @dev returns list of validators for this cohort
     * @return array of validators
     */
    function returnValidators() public view returns (address[] memory) {
        return validators;
    }

    /**
     * @dev to be called by administrator to update new amount for required quorum
     * @param _requiredQuorum new value of required quorum
     */
    function updateQuorum(uint256 _requiredQuorum) public isSetter() {
        require(_requiredQuorum != 0, "New quorum value can't be 0");
        requiredQuorum = _requiredQuorum;
    }

    function resetOutstandingValidations() public isController() {
        outstandingValidations = 0;
        emit LogOutstandingValidationRest(outstandingValidations);
    }

    function addAdditionalValidator(address validator) public returns (bool){
        require(msg.sender == cohortFactory, "Cohort:addAdditionalValidator - You are not authorized to call this function");        
        validators.push(validator);
        emit additionalValidatorAdded(validator);
        return true;
    }
    
    function removeValidator(address validator, address _enterprise) public returns (bool) {

        require(msg.sender == cohortFactory && enterprise == _enterprise, "Cohort:removeValidator - You are not authorized to call this function");
        for (uint256 i; i< validators.length; i++){

            if (validators[i] == validator) {
                validators[i] =  validators[validators.length - 1] ;
                validators.pop();                    
                emit ValidatorRemoved(validator);
                return (true);
            }
        }
         return false;
    }

    function checkIfEnterpriseHasFunds(address _enterprise) public view returns (bool) {
        return ( members.deposits(_enterprise) > members
                    .amountTokensPerValidation()
                    .mul(outstandingValidations)
                    .mul(members.enterpriseMatch())
                    .div(1e4));
    }
    /**
     * @dev to be called by Enterprise to initiate new validation
     * @param documentHash - hash of unique identifier of validated transaction
     */
    function initializeValidation(bytes32 documentHash) public {
        // div(1e4) account for precision up to 4 decimal points
        require(checkIfEnterpriseHasFunds(msg.sender), "Cohort:initializeValidation - Not sufficient funds. Deposit additional funds.");
        require(documentHash.length > 0, "Cohort:initializeValidation - Document hash value can't be 0");
        require(enterprise == msg.sender, "Cohort:initializeValidation - Only enterprise owing this cohort can call this function");
        uint256 validationTime = block.timestamp;
        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime));

        outstandingValidations++;
        Validation storage newValidation = validations[validationHash];
        newValidation.validationTime = block.timestamp;
        emit ValidationInitialized(validationHash, validationTime, documentHash);
    }

    /**
     * @dev Review the validation results
     * @param validationHash - consist of hash of hashed document and timestamp
     * @return array  of validators
     * @return array of stakes of each validator
     * @return array of validation choices for each validator
     */
    function collectValidationResults(bytes32 validationHash)
        public
        view
        returns (
            address[] memory,
            uint256[] memory,
            ValidationStatus[] memory
        )
    {
        address[] memory validatorsList = validators;
        uint256[] memory stake = new uint256[](validators.length);
        ValidationStatus[] memory validatorsValues = new ValidationStatus[](validators.length);

        Validation storage validation = validations[validationHash];

        for (uint256 i = 0; i < validators.length; i++) {
            stake[i] = members.deposits(validators[i]);
            validatorsValues[i] = validation.validatorChoice[validators[i]];
        }
        return (validatorsList, stake, validatorsValues);
    }

    /**
     * @dev validators can check if specific document has been already validated by them
     * @param validationHash - consist of hash of hashed document and timestamp
     * @return validation choices used by validator
     */
    function isValidated(bytes32 validationHash) public view returns (ValidationStatus){
        return validations[validationHash].validatorChoice[msg.sender];
    }

    /**
     * @dev to calculate state of the quorum for the validation
     * @param validationHash - consist of hash of hashed document and timestamp
     * @return number representing current participation level in percentage
     */
    function calculateVoteQuorum(bytes32 validationHash)
        public
        view
        returns (uint256)
    {
        uint256 totalStaked;
        uint256 currentlyVoted;

        Validation storage validation = validations[validationHash];
        require(validation.validationTime > 0, "Cohort:calculateVoteQuorum - Validation hash doesn't exist");

        for (uint256 i = 0; i < validators.length; i++) {
            totalStaked += members.deposits(validators[i]);
            if (validation.validatorChoice[validators[i]] != ValidationStatus.Undefined) 
                currentlyVoted += members.deposits(validators[i]);
        }
        return (currentlyVoted * 100) / totalStaked;
    }

    /**
     * @dev to mark validation as executed. This happens when participation level reached "requiredQuorum"
     * @param validationHash - consist of hash of hashed document and timestamp
     */
    function executeValidation(bytes32 validationHash, bytes32 documentHash) internal {
        if (calculateVoteQuorum(validationHash) >= requiredQuorum) {
            Validation storage validation = validations[validationHash];
            validation.executionTime = block.timestamp;
            emit ValidationExecuted(validationHash, block.timestamp, documentHash);
        }
    }

    /**
     * @dev called by validator to approve or disapprove this validation
     * @param documentHash - hash of validated document
     * @param validationTime - this is the time when validation has been initialized
     * @param decision - one of the ValidationStatus choices cast by validator
     */
    function validate(
        bytes32 documentHash,
        uint256 validationTime,
        ValidationStatus decision
    ) public {
        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime));
        Validation storage validation = validations[validationHash];
        require(members.validatorMap(msg.sender),"Cohort:validate - Validator is not authorized.");
        require(validation.validationTime == validationTime, "Cohort:validate - the validation params don't match.");
        require(validation.validatorChoice[msg.sender] ==ValidationStatus.Undefined, "Cohort:validate - This document has been validated already.");
        validation.validatorChoice[msg.sender] = decision;

        if (validation.executionTime == 0) 
            executeValidation(validationHash, documentHash);

        emit ValidatorValidated(msg.sender, documentHash, validationTime, decision);
    }

    function isHashAndTimeCorrect( bytes32 documentHash, uint256 validationTime) public view returns (bool){

        bytes32 validationHash = keccak256(abi.encodePacked(documentHash, validationTime));
        Validation storage validation = validations[validationHash];
        if (validation.validationTime == validationTime)
            return true;
        else
            return false;
    }
}