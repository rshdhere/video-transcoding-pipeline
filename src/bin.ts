import "dotenv/config";
import { app } from "./index.js";
import { PORT } from "./config/config.js";

app.listen(PORT, () => {
  console.log(`server listening on port ${PORT}`);
});
