// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

/// @title KYCRegistry
/// @notice A registry contract that manages KYC levels for addresses.
enum KYCLevel {
    None, // 0 - No KYC required (permissionless)
    L1, // 1 - Basic KYC
    L2, // 2 - Intermediate KYC
    L3  // 3 - Full KYC
}

interface IKYCRegistry {
    /// @notice Returns the KYC level of a user.
    function kycLevelOf(address user) external view returns (KYCLevel);

    /// @notice Returns whether the user meets the required KYC level.
    /// @dev Returns true if requiredLevel is None or user's level >= requiredLevel.
    function isKYCVerified(address user, KYCLevel requiredLevel) external view returns (bool);
}

/// @title KYCRegistry
/// @notice Owner-governed registry for managing per-address KYC levels.
contract KYCRegistry is IKYCRegistry {
    /// @notice The owner of the registry, who can set KYC levels.
    address public owner;

    /// @notice The KYC level of each address.
    mapping(address => KYCLevel) public kycLevelOf;

    /// @notice Emitted when the owner is changed.
    event SetOwner(address indexed newOwner);

    /// @notice Emitted when a user's KYC level is set.
    event KYCLevelSet(address indexed user, KYCLevel level);

    /// @dev Reverts if the caller is not the owner.
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address newOwner) {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
        emit SetOwner(newOwner);
    }

    /// @notice Sets a new owner.
    function setOwner(address newOwner) external onlyOwner {
        require(newOwner != owner, "already set");
        owner = newOwner;
        emit SetOwner(newOwner);
    }

    /// @notice Sets the KYC level for a single user.
    /// @param user The address to set the KYC level for.
    /// @param level The KYC level to assign.
    function setKYCLevel(address user, KYCLevel level) external onlyOwner {
        kycLevelOf[user] = level;
        emit KYCLevelSet(user, level);
    }

    /// @notice Sets the KYC level for multiple users in a single transaction.
    /// @param users The addresses to set the KYC level for.
    /// @param level The KYC level to assign to all given addresses.
    function batchSetKYCLevel(address[] calldata users, KYCLevel level) external onlyOwner {
        uint256 length = users.length;
        for (uint256 i; i < length;) {
            kycLevelOf[users[i]] = level;
            emit KYCLevelSet(users[i], level);
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Returns whether the user meets the required KYC level.
    /// @param user The address to check.
    /// @param requiredLevel The required KYC level.
    /// @return True if the user's KYC level is sufficient or if no KYC is required.
    function isKYCVerified(address user, KYCLevel requiredLevel) external view returns (bool) {
        if (requiredLevel == KYCLevel.None) return true;
        return kycLevelOf[user] >= requiredLevel;
    }
}