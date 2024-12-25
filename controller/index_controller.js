class IndexController {
  static async index(req, res) {
    const user = req.user;
    return res.render('index', { user: user });
  }
}

export default IndexController;
