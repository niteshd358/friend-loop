import User from "../models/User.js";

class UserRepository {
  async findById(id: string) {
    return User.findById(id).select("-password");
  }

  async findByEmail(email: string) {
    return User.findOne({ email });
  }

  async create(userData: any) {
    const user = new User(userData);
    return user.save();
  }

  async searchUsers(query: string, currentUserId: string) {
    return User.find({
      $and: [
        {
          $or: [
            { username: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
          ],
        },
        { _id: { $ne: currentUserId } },
      ],
    }).select("-password");
  }

  async updateLastSeen(id: string) {
    return User.findByIdAndUpdate(id, { lastSeen: Date.now() });
  }
}

export default new UserRepository();
