import mongoose from "mongoose";

const conferenceSchema = new mongoose.Schema({
    username: String,
    tenHoiNghi: String,
    ngayToChuc: String,
    huyenToChuc: String,
    diaDiem: String,
    nhomPhuTrach: String,
    loaiHinh: String,
    SL: Number,
    anhDanhSach: String,
    anhTongThe: String,
    PC: String
}, { timestamps: true });

const conferenceData = mongoose.model('Conference', conferenceSchema);

export default conferenceData;