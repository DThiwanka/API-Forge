const modalStore = {
  activeModal: null,
  modalProps: {},
  openModal(name, props = {}) {
    this.activeModal = name;
    this.modalProps = props;
  },
  closeModal() {
    this.activeModal = null;
    this.modalProps = {};
  },
};

export default modalStore;
